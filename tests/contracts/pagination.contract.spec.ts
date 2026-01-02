import { test, expect } from '../fixtures/api.fixture';

test('GET /api/users pagination contract is consistent', async ({ api }) => {
  const perPage = 3;

  const res1 = await api.get(`/api/users?page=1&per_page=${perPage}`);
  expect(res1.status()).toBe(200);
  const b1 = await res1.json();

  const res2 = await api.get(`/api/users?page=2&per_page=${perPage}`);
  expect(res2.status()).toBe(200);
  const b2 = await res2.json();

  // Contract: metadata exists + consistent
  expect(b1.page).toBe(1);
  expect(b2.page).toBe(2);
  expect(b1.per_page).toBe(perPage);
  expect(b2.per_page).toBe(perPage);

  expect(typeof b1.total).toBe('number');
  expect(typeof b1.total_pages).toBe('number');

  // Contract: page 1 and page 2 should not be identical
  const ids1 = (b1.data ?? []).map((u: any) => u.id);
  const ids2 = (b2.data ?? []).map((u: any) => u.id);

  expect(ids1.length).toBeGreaterThan(0);
  expect(ids2.length).toBeGreaterThan(0);

  // No overlap expected between pages (typical contract)
  const overlap = ids1.filter((id: any) => ids2.includes(id));
  expect(overlap).toEqual([]);
});

test('GET /api/users returns empty list when page > total_pages', async ({ api }) => {
  const res = await api.get('/api/users?page=1');
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(typeof body.total_pages).toBe('number');

  const beyond = body.total_pages + 1;

  const resBeyond = await api.get(`/api/users?page=${beyond}`);
  expect(resBeyond.status()).toBe(200);

  const bBeyond = await resBeyond.json();

  // Contract: data exists and is empty (common API contract)
  expect(Array.isArray(bBeyond.data)).toBe(true);
  expect(bBeyond.data.length).toBe(0);

  // Contract: metadata reflects requested page
  expect(bBeyond.page).toBe(beyond);
});