import { request, APIRequestContext } from '@playwright/test';

type TokenResponse = {
  access_token: string;
  expires_in?: number; // seconds
  token_type?: string;
};

type CachedToken = {
  token: string;
  expiresAtMs: number;
};

const cache: Record<string, CachedToken> = {};

function nowMs() {
  return Date.now();
}

function cacheKey() {
  const base = (process.env.AUTH_BASE_URL || '').trim();
  const path = (process.env.AUTH_TOKEN_PATH || '/oauth/token').trim();
  const clientId = (process.env.AUTH_CLIENT_ID || '').trim();
  const scope = (process.env.AUTH_SCOPE || '').trim();
  return `${base}|${path}|${clientId}|${scope}`;
}

export async function getAccessToken(): Promise<string> {
  const baseURL = (process.env.AUTH_BASE_URL || '').trim();
  if (!baseURL) throw new Error('AUTH_BASE_URL is required for token acquisition');

  const key = cacheKey();
  const hit = cache[key];

  // refresh 30s before expiry to avoid edge failures
  if (hit && hit.expiresAtMs - nowMs() > 30_000) {
    return hit.token;
  }

  const tokenPath = (process.env.AUTH_TOKEN_PATH || '/oauth/token').trim();
  const clientId = (process.env.AUTH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.AUTH_CLIENT_SECRET || '').trim();
  const scope = (process.env.AUTH_SCOPE || '').trim();

  if (!clientId || !clientSecret) {
    throw new Error('AUTH_CLIENT_ID and AUTH_CLIENT_SECRET are required');
  }

  // Use a separate lightweight request context for auth
  const authApi: APIRequestContext = await request.newContext({
    baseURL,
    extraHTTPHeaders: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10_000,
  });

  const form = new URLSearchParams();
  form.set('grant_type', 'client_credentials');
  form.set('client_id', clientId);
  form.set('client_secret', clientSecret);
  if (scope) form.set('scope', scope);

  const res = await authApi.post(tokenPath, { data: form.toString() });

  const text = await res.text();
  if (!res.ok()) {
    await authApi.dispose();
    throw new Error(`Token request failed: ${res.status()} ${text}`);
  }

  const json = JSON.parse(text) as TokenResponse;

  if (!json.access_token) {
    await authApi.dispose();
    throw new Error(`Token response missing access_token: ${text}`);
  }

  const expiresInSec = Number(json.expires_in ?? 3600);
  const expiresAtMs = nowMs() + expiresInSec * 1000;

  cache[key] = { token: json.access_token, expiresAtMs };

  await authApi.dispose();
  return json.access_token;
}

// optional: call this if a test gets 401 and you want to force refresh
export function invalidateTokenCache() {
  delete cache[cacheKey()];
}