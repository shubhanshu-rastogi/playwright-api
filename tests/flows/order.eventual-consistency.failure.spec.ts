import { test, expect } from '../fixtures/api.fixture';
import { pollUntil } from '../utils/poll';

test.skip('Order ship async flow eventually fails and exposes standard error', async ({ api }) => {
  // Step 1: Create order
  const createRes = await api.post('/v1/orders', {
    data: { customerId: 'cust-1', items: [{ sku: 'sku-1', qty: 1 }] },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
  expect(createRes.status()).toBe(201);
  const created = await createRes.json();
  const orderId = created.id;

  // Step 2: Trigger async ship, but force failure via feature flag/test hook
  // Your microservice will support this later, e.g. header or query:
  // 'X-Force-Failure': 'true'
  const shipRes = await api.post(`/v1/orders/${orderId}/ship`, {
    headers: { 'X-Force-Failure': 'true' },
  });
  expect([200, 202]).toContain(shipRes.status());

  // Step 3: Poll until status becomes FAILED
  const final = await pollUntil(
    async () => {
      const getRes = await api.get(`/v1/orders/${orderId}`);
      expect(getRes.status()).toBe(200);
      return await getRes.json();
    },
    (order) => order.status === 'FAILED',
    { timeoutMs: 20_000, intervalMs: 500, name: 'order status FAILED' }
  );

  expect(final.status).toBe('FAILED');

  // Contract: failure contains a machine-readable code + traceId
  expect(final).toHaveProperty('error');
  expect(final.error).toHaveProperty('code');
  expect(final.error).toHaveProperty('message');
  expect(final.error).toHaveProperty('traceId');
});