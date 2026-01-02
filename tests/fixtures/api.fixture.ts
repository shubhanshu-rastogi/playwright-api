import 'dotenv/config';
import { test as base, APIRequestContext, expect } from '@playwright/test';

type ApiLog = {
  method: string;
  url: string;
  status: number;
  response: string;
  attempt?: number;
};

const redact = (s: string) =>
  s.replace(/(x-api-key:\s*)\S+/gi, '$1***')
   .replace(/("x-api-key"\s*:\s*")[^"]+(")/gi, '$1***$2');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isRetryableStatus = (status: number) => [500, 502, 503, 504].includes(status);
const backoffMs = (attempt: number, baseMs = 200, maxMs = 2000) =>
  Math.min(maxMs, baseMs * Math.pow(2, attempt - 1));

export const test = base.extend<{ api: APIRequestContext }>({
  api: async ({ playwright }, use, testInfo) => {
    const envBaseURL = (process.env.BASE_URL || '').trim();
    const configBaseURL = (testInfo.project.use.baseURL as string | undefined) || '';
    const baseURL = envBaseURL || configBaseURL || 'https://reqres.in';

    if (!/^https?:\/\//.test(baseURL)) {
      throw new Error(`BASE_URL must start with http(s). Received: ${baseURL}`);
    }

    // Build headers safely: only include x-api-key if it exists
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const apiKey = (process.env.REQRES_API_KEY || '').trim();
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const api = await playwright.request.newContext({
      baseURL,
      timeout: 3000, // hard client timeout
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
          const res = await original(url, options);
          const body = await res.text();
          const status = res.status();

          logs.push({
            method: method.toUpperCase(),
            url: `${baseURL}${url}`,
            status,
            response: body,
            attempt,
          });

          // Retry policy:
          // - Retry only transient 5xx
          // - Do NOT retry POST unless Idempotency-Key is present (safe default)
          const isPost = method === 'post';
          const hasIdempotencyKey = !!options?.headers?.['Idempotency-Key'];
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

    if (testInfo.status !== testInfo.expectedStatus) {
      testInfo.attach(`api-logs-${testInfo.title}`, {
        body: redact(JSON.stringify(logs, null, 2)),
        contentType: 'application/json',
      });
      console.log(`❌ ${testInfo.title} failed. API logs attached to HTML report.`);
    }

    await api.dispose();
  },
});

export { expect };