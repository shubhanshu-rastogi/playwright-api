import { test, expect } from '../fixtures/api.fixture';
import { buildCreateUserPayload } from '../data/builders/user.builder';

test('POST /api/users creates user', async ({ api }) => {
  const payload = buildCreateUserPayload({ job: 'automation' });

  const res = await api.post('/api/users', { data: payload });
  expect(res.status()).toBe(201);

  const body = await res.json();
  expect(body.name).toBe(payload.name);
  expect(body.job).toBe(payload.job);
});

// ReqRes is a demo API and does not enforce validation for this endpoint.
test.skip('POST /api/users fails when name is missing (ReqRes does not validate)', async ({ api }) => {
  const payload = buildCreateUserPayload({ name: undefined as any });
  const res = await api.post('/api/users', { data: payload });
  expect(res.status()).toBeGreaterThanOrEqual(400);
});

test.skip('POST /api/users fails with invalid job type (ReqRes does not validate)', async ({ api }) => {
  const payload = buildCreateUserPayload({ job: 123 as any });
  const res = await api.post('/api/users', { data: payload });
  expect(res.status()).toBeGreaterThanOrEqual(400);
});