import { test, expect } from '@playwright/test';
import 'dotenv/config';
import { retry } from '../utils/retry';

test('retries once on 500 then succeeds', async ({ browser }) => {
  const context = await browser.newContext();
  let failOnce = true;

  await context.route('**/api/users', async (route) => {
    const req = route.request();
    if (req.method() === 'POST' && failOnce) {
      failOnce = false;
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    }
    return route.continue();
  });

  const page = await context.newPage();
  await page.goto('about:blank');

  const result = await retry(async () => {
    const r = await page.evaluate(async (baseURL) => {
      const res = await fetch(`${baseURL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer fake-token' },
        body: JSON.stringify({ name: 'john', job: 'qa' }),
      });
      const json = await res.json();
      return { status: res.status, json };
    }, process.env.BASE_URL);

    if (r.status >= 500) throw new Error(`Transient error: ${r.status}`);
    return r;
  }, 2);

  expect(result.status).toBe(201);
  expect(result.json.name).toBe('john');

  await context.close();
});