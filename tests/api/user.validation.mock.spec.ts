import { test, expect } from '@playwright/test';
import 'dotenv/config';

test('POST /api/users returns 400 when name is missing (mocked)', async ({ browser }) => {
  const context = await browser.newContext();

  await context.route('**/api/users', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = req.postDataJSON?.() ?? {};
      if (!body.name) {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'name is required' }),
        });
      }
    }
    return route.continue();
  });

  const page = await context.newPage();
  await page.goto('about:blank');

  const result = await page.evaluate(async (baseURL) => {
    const r = await fetch(`${baseURL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job: 'qa' })
    });
    return { status: r.status, json: await r.json() };
  }, process.env.BASE_URL);

  expect(result.status).toBe(400);
  expect(result.json.error).toBe('name is required');

  await context.close();
});