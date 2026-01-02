import { test, expect } from '@playwright/test';
import 'dotenv/config';

test('POST /api/users returns 429 when rate limit exceeded (mocked)', async ({ browser }) => {
  const context = await browser.newContext();
  let requestCount = 0;

  await context.route('**/api/users', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      requestCount++;

      if (requestCount > 3) {
        return route.fulfill({
          status: 429,
          headers: {
            'Retry-After': '2'
          },
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Too many requests' }),
        });
      }
    }
    return route.continue();
  });

  const page = await context.newPage();
  await page.goto('about:blank');

  let lastResponse = { status: 0 };
  for (let i = 0; i < 5; i++) {
    lastResponse = await page.evaluate(async (baseURL) => {
      const r = await fetch(`${baseURL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'john', job: 'qa' }),
      });
      return { status: r.status };
    }, process.env.BASE_URL);
  }

  expect(lastResponse.status).toBe(429);

  await context.close();
});