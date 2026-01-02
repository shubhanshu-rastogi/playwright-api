import { test, expect } from '../fixtures/api.fixture';

test('GET /api/users/2 returns 200 and user id=2', async ({ api }) => {
  const res = await api.get('/api/users/2');
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.data.id).toBe(2);
});

test('GET /api/users/2 meets response time SLA', async ({ api }) => {
  const start = Date.now();

  const res = await api.get('/api/users/2');
  const durationMs = Date.now() - start;

  expect(res.status()).toBe(200);
  expect(durationMs).toBeLessThan(500); // SLA example
});