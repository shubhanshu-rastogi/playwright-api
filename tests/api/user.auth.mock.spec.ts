import { test, expect } from '@playwright/test';
import 'dotenv/config';

test('POST /api/users returns 401 when token is missing (mocked)', async ({ browser }) => {
  const context = await browser.newContext();

  await context.route('**/api/users', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const auth = req.headers()['authorization'];
      if (!auth) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
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
      headers: { 'Content-Type': 'application/json' }, // no Authorization
      body: JSON.stringify({ name: 'john', job: 'qa' }),
    });
    return { status: r.status, json: await r.json() };
  }, process.env.BASE_URL);

  expect(result.status).toBe(401);
  expect(result.json.error).toBe('Unauthorized');

  await context.close();
});

test('POST /api/users returns 201 when Authorization is present (not mocked)', async ({ browser }) => {
  const context = await browser.newContext();

  await context.route('**/api/users', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const auth = req.headers()['authorization'];
      if (!auth) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
      body: JSON.stringify({ name: 'john', job: 'qa' }),
    });
    return { status: r.status, json: await r.json() };
  }, process.env.BASE_URL);

  expect(result.status).toBe(201);
  expect(result.json.name).toBe('john');

  await context.close();
});