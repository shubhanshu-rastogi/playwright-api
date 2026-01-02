import { test, expect } from '../fixtures/api.fixture';
import { pollUntil } from '../utils/poll';

test.skip('Order status eventually becomes SHIPPED after ship request', async ({ api }) => {
  // Step 1: Create order
  const createRes = await api.post('/v1/orders', {
    data: { customerId: 'cust-1', items: [{ sku: 'sku-1', qty: 1 }] },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
  expect(createRes.status()).toBe(201);
  const created = await createRes.json();
  const orderId = created.id;

  // Step 2: Trigger async action (ship kicks off background worker)
  const shipRes = await api.post(`/v1/orders/${orderId}/ship`);
  expect([200, 202]).toContain(shipRes.status());

  // Step 3: Poll until status changes
  const final = await pollUntil(
    async () => {
      const getRes = await api.get(`/v1/orders/${orderId}`);
      expect(getRes.status()).toBe(200);
      return await getRes.json();
    },
    (order) => order.status === 'SHIPPED',
    { timeoutMs: 15_000, intervalMs: 500, name: 'order status SHIPPED' }
  );

  expect(final.status).toBe('SHIPPED');
});