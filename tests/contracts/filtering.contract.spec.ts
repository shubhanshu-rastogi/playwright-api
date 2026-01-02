import { test, expect } from '../fixtures/api.fixture';

test.skip('GET /v1/orders filters by status', async ({ api }) => {
  // Enable this test when the microservices app is running
  // and BASE_URL points to that environment (e.g. localhost).

  const status = 'PENDING';

  const res = await api.get(`/v1/orders?status=${status}&limit=20`);
  expect(res.status()).toBe(200);

  const body = await res.json();
  const items = body.data as Array<{ id: string; status: string }>;

  expect(Array.isArray(items)).toBe(true);

  // Contract: every returned item must satisfy the filter
  for (const it of items) {
    expect(it.status).toBe(status);
  }
});