import { test, expect } from '../fixtures/api.fixture';
import { isSorted } from './sort.utils';

test.skip('GET /v1/users supports stable sorting by createdAt', async ({ api }) => {
  // This endpoint is for your microservices app (not ReqRes).
  // Once your app is running, this test will work as-is.
  const res = await api.get('/v1/users?sort=createdAt&order=asc&limit=20');
  expect(res.status()).toBe(200);

  const body = await res.json();
  const items = body.data as Array<{ id: string; createdAt: string }>;

  expect(Array.isArray(items)).toBe(true);
  expect(items.length).toBeGreaterThan(0);

  // Contract: sorted ascending by createdAt
  const ok = isSorted(items, (u) => new Date(u.createdAt).getTime(), 'asc');
  expect(ok).toBe(true);

  // Contract: stable tie-breaker (when createdAt is equal, id is ascending)
  // This assumes your API defines "id" as tie-breaker. We will implement that in your app.
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const curr = items[i];

    if (prev.createdAt === curr.createdAt) {
      expect(prev.id <= curr.id).toBe(true);
    }
  }
});