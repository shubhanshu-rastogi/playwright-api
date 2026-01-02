import { test, expect } from '@playwright/test';
import 'dotenv/config';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitterMs(maxJitterMs: number) {
  return maxJitterMs > 0 ? Math.floor(Math.random() * maxJitterMs) : 0;
}

test('handles 429 Retry-After then succeeds (mocked)', async ({ browser }) => {
  const context = await browser.newContext();
  let callCount = 0;

  await context.route('**/api/users', async (route) => {
    const req = route.request();
    if (req.method() !== 'POST') return route.continue();

    callCount += 1;

    // 1st call -> 429 with Retry-After (exposed to browser)
    if (callCount === 1) {
      return route.fulfill({
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '1',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Retry-After',
        },
        body: JSON.stringify({ error: 'Too many requests' }),
      });
    }

    // 2nd call -> 201 success
    return route.fulfill({
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ id: '123', name: 'john', job: 'qa' }),
    });
  });

  const page = await context.newPage();
  await page.goto('about:blank');

  const baseURL = (process.env.BASE_URL || '').trim();
  expect(baseURL).toBeTruthy();

  // --- 1st attempt ---
  const r1 = await page.evaluate(async (url) => {
    const res = await fetch(`${url}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'john', job: 'qa' }),
    });

    // Header name is case-insensitive, but the browser will show it only if exposed
    const retryAfter = res.headers.get('Retry-After');
    return { status: res.status, retryAfter };
  }, baseURL);

  expect(r1.status).toBe(429);
  expect(r1.retryAfter).toBeTruthy();

  const retryAfterSeconds = Number(r1.retryAfter);
  expect(Number.isFinite(retryAfterSeconds)).toBe(true);

  const bufferMs = 200;
  const maxJitterMs = 150;
  const waitMs = retryAfterSeconds * 1000 + bufferMs + jitterMs(maxJitterMs);

  await sleep(waitMs);

  // --- 2nd attempt ---
  const r2 = await page.evaluate(async (url) => {
    const res = await fetch(`${url}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'john', job: 'qa' }),
    });
    const json = await res.json();
    return { status: res.status, json };
  }, baseURL);

  expect(r2.status).toBe(201);
  expect(r2.json.name).toBe('john');

  await context.close();
});