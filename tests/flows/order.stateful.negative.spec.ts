import { test, expect } from '../fixtures/api.fixture';

test.skip('Order cannot ship before payment (invalid state transition)', async ({ api }) => {
  // Step 1: Create order (PENDING)
  const createRes = await api.post('/v1/orders', {
    data: { customerId: 'cust-1', items: [{ sku: 'sku-1', qty: 1 }] },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
  expect(createRes.status()).toBe(201);

  const created = await createRes.json();
  expect(created.status).toBe('PENDING');
  const orderId = created.id;

  // Step 2: Attempt to ship without paying
  const shipRes = await api.post(`/v1/orders/${orderId}/ship`);
  expect([400, 409]).toContain(shipRes.status());

  const err = await shipRes.json();

  // Contract: standard error model
  expect(err).toHaveProperty('code');
  expect(err).toHaveProperty('message');
  expect(err).toHaveProperty('traceId');
});