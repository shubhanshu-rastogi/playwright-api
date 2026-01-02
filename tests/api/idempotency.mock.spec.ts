import { test, expect } from '@playwright/test';
import 'dotenv/config';

test('POST is idempotent when Idempotency-Key is reused (mocked)', async ({ browser }) => {
  const context = await browser.newContext();

  // In-memory store to simulate server-side idempotency cache
  const cache = new Map<string, { status: number; body: any }>();

  await context.route('**/api/users', async (route) => {
    const req = route.request();
    if (req.method() !== 'POST') return route.continue();

    const key = req.headers()['idempotency-key'];
    if (!key) {
      // If no key, behave like a normal non-idempotent POST create
      return route.fulfill({
        status: 201,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ id: String(Date.now()), created: true }),
      });
    }

    // If key was seen before, return the same response again
    const existing = cache.get(key);
    if (existing) {
      return route.fulfill({
        status: 200, // many APIs return 200 for replay; some return 201 again
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(existing.body),
      });
    }

    // First time we see this key: "create" and store the result
    const createdBody = { id: 'user-123', created: true };
    cache.set(key, { status: 201, body: createdBody });

    return route.fulfill({
      status: 201,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(createdBody),
    });
  });

  const page = await context.newPage();
  await page.goto('about:blank');

  const baseURL = (process.env.BASE_URL || 'https://reqres.in').trim();
  const key = 'abc-123';

  const first = await page.evaluate(async ({ baseURL, key }) => {
    const r = await fetch(`${baseURL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify({ name: 'john', job: 'qa' }),
    });
    return { status: r.status, json: await r.json() };
  }, { baseURL, key });

  const second = await page.evaluate(async ({ baseURL, key }) => {
    const r = await fetch(`${baseURL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify({ name: 'john', job: 'qa' }),
    });
    return { status: r.status, json: await r.json() };
  }, { baseURL, key });

  expect(first.status).toBe(201);
  expect(second.status).toBe(200);       // replay response
  expect(second.json.id).toBe(first.json.id); // same outcome
  expect(second.json.created).toBe(true);

  await context.close();
});