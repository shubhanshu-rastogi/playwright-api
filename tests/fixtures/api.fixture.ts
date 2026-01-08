import 'dotenv/config';
import { test as base, APIRequestContext, expect } from '@playwright/test';
import { getAccessToken, invalidateTokenCache } from '../auth/tokenManager';

type ApiLog = {
  method: string;
  url: string;
  status: number;
  response: string;
  attempt?: number;
  durationMs?: number;
};

const redact = (s: string) =>
  s
    .replace(/(x-api-key:\s*)\S+/gi, '$1***')
    .replace(/("x-api-key"\s*:\s*")[^"]+(")/gi, '$1***$2')
    .replace(/(authorization:\s*bearer\s*)\S+/gi, '$1***')
    .replace(/("authorization"\s*:\s*")[^"]+(")/gi, '$1***$2');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isRetryableStatus = (status: number) => [500, 502, 503, 504].includes(status);

const backoffMs = (attempt: number, baseMs = 200, maxMs = 2000) =>
  Math.min(maxMs, baseMs * Math.pow(2, attempt - 1));

function summariseApiLogs(logs: ApiLog[]) {
  if (!logs.length) return 'No API calls were recorded for this test.';
  const statuses = logs.map((l) => l.status).join(' -> ');
  const last = logs[logs.length - 1];
  return [
    `Total calls: ${logs.length}`,
    `Statuses: ${statuses}`,
    `Last call: ${last.method} ${last.url}`,
    `Last status: ${last.status}`,
    `Last durationMs: ${last.durationMs ?? 'n/a'}`,
  ].join('\n');
}

function getHeader(options: any, name: string): string | undefined {
  const h = options?.headers;
  if (!h) return undefined;

  // array form: [ [k,v], [k,v] ]
  if (Array.isArray(h)) {
    const found = h.find(([k]: [string, string]) => String(k).toLowerCase() === name.toLowerCase());
    return found?.[1];
  }

  // object form: { k: v }
  const key = Object.keys(h).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? h[key] : undefined;
}

function withHeader(options: any, key: string, value: string) {
  const next = { ...(options || {}) };
  const headers = next.headers;

  // Preserve user style if they used array headers
  if (Array.isArray(headers)) {
    const out = headers.slice();
    const idx = out.findIndex(([k]: [string, string]) => String(k).toLowerCase() === key.toLowerCase());
    if (idx >= 0) out[idx] = [key, value];
    else out.push([key, value]);
    next.headers = out;
    return next;
  }

  next.headers = { ...(headers || {}), [key]: value };
  return next;
}

export const test = base.extend<{ api: APIRequestContext }>({
  api: async ({ playwright }, use, testInfo) => {
    const envBaseURL = (process.env.BASE_URL || '').trim();
    const configBaseURL = (testInfo.project.use.baseURL as string | undefined) || '';
    const baseURL = envBaseURL || configBaseURL || 'https://reqres.in';

    if (!/^https?:\/\//.test(baseURL)) {
      throw new Error(`BASE_URL must start with http(s). Received: ${baseURL}`);
    }

    // Build headers safely
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const apiKey = (process.env.REQRES_API_KEY || '').trim();
    if (apiKey) headers['x-api-key'] = apiKey;

    // 🔐 Token Manager integration:
    // Only add Authorization when AUTH_BASE_URL is provided (so local WireMock/ReqRes runs don't break)
    const authEnabled = !!(process.env.AUTH_BASE_URL || '').trim();
    if (authEnabled) {
      const token = await getAccessToken();
      headers['Authorization'] = `Bearer ${token}`;
    }

    const api = await playwright.request.newContext({
      baseURL,
      timeout: 3000,
      extraHTTPHeaders: headers,
    });

    const logs: ApiLog[] = [];
    const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;

    for (const method of methods) {
      const original = (api as any)[method].bind(api);

      (api as any)[method] = async (url: string, options?: any) => {
        const maxAttempts = 3;
        let attempt = 1;

        while (true) {
          const t0 = Date.now();
          let res = await original(url, options);
          let durationMs = Date.now() - t0;

          let body = await res.text();
          let status = res.status();

          logs.push({
            method: method.toUpperCase(),
            url: `${baseURL}${url}`,
            status,
            response: body,
            attempt,
            durationMs,
          });

          // 🔐 One-time auth refresh on 401 (only if auth is enabled)
          // We retry once to handle expired/revoked tokens without hiding real auth bugs.
          if (authEnabled && status === 401) {
            invalidateTokenCache();
            const fresh = await getAccessToken();
            const retryOptions = withHeader(options, 'Authorization', `Bearer ${fresh}`);

            const t1 = Date.now();
            res = await original(url, retryOptions);
            durationMs = Date.now() - t1;

            body = await res.text();
            status = res.status();

            logs.push({
              method: method.toUpperCase(),
              url: `${baseURL}${url}`,
              status,
              response: body,
              attempt: attempt + 1,
              durationMs,
            });

            return res;
          }

          // Retry policy for transient 5xx:
          // - Retry only transient 5xx
          // - Do NOT retry POST unless Idempotency-Key is present (safe default)
          const isPost = method === 'post';
          const idempotencyKey = getHeader(options, 'Idempotency-Key');
          const hasIdempotencyKey = !!(idempotencyKey && String(idempotencyKey).trim());
          const canRetryMethod = !isPost || hasIdempotencyKey;

          const shouldRetry =
            isRetryableStatus(status) &&
            canRetryMethod &&
            attempt < maxAttempts;

          if (!shouldRetry) return res;

          await sleep(backoffMs(attempt));
          attempt += 1;
        }
      };
    }

    await use(api);

    // ✅ ALWAYS attach summary
    testInfo.attach(`api-summary-${testInfo.title}`, {
      body: summariseApiLogs(logs),
      contentType: 'text/plain',
    });

    // ❌ Attach full logs only on failure
    if (testInfo.status !== testInfo.expectedStatus) {
      testInfo.attach(`api-logs-${testInfo.title}`, {
        body: redact(JSON.stringify(logs, null, 2)),
        contentType: 'application/json',
      });
      console.log(`❌ ${testInfo.title} failed. API summary/logs attached.`);
    }

    await api.dispose();
  },
});

export { expect };