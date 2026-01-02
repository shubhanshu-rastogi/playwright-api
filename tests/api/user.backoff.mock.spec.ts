import { test, expect } from '@playwright/test';
import 'dotenv/config';
import { withExponentialBackoff } from '../utils/backoff';

test('exponential backoff retries on 500 then succeeds (mocked)', async ({ browser }) => {
  const context = await browser.newContext();
  let failCount = 0;

  await context.route('**/api/users', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      failCount += 1;

      if (failCount <= 2) {
        return route.fulfill({
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      }

      return route.fulfill({
        status: 201,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ id: '1', name: 'john', job: 'qa' }),
      });
    }
    return route.continue();
  });

  const page = await context.newPage();
  await page.goto('about:blank');

  const baseURL = process.env.BASE_URL!;

  const { result, attempts } = await withExponentialBackoff(
    async () => {
      const r = await page.evaluate(async (url) => {
        const res = await fetch(`${url}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'john', job: 'qa' }),
        });
        const json = await res.json();
        return { status: res.status, json };
      }, baseURL);

      if (r.status >= 500) throw new Error(`Retryable ${r.status}`);
      return r;
    },
    (err) => String(err?.message ?? '').includes('Retryable'),
    { maxAttempts: 4, baseDelayMs: 200, maxDelayMs: 2000, jitterMs: 0 } // keep deterministic in tests
  );

  expect(attempts).toBe(3); // 2 failures + 1 success
  expect(result.status).toBe(201);
  expect(result.json.name).toBe('john');

  await context.close();
});