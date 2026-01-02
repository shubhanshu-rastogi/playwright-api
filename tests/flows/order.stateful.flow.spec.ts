import { test, expect } from '../fixtures/api.fixture';

test.skip('Order happy path: create -> pay -> ship', async ({ api }) => {
  // Step 1: Create
  const createRes = await api.post('/v1/orders', {
    data: { customerId: 'cust-1', items: [{ sku: 'sku-1', qty: 1 }] },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
  expect(createRes.status()).toBe(201);

  const created = await createRes.json();
  expect(created).toHaveProperty('id');
  expect(created.status).toBe('PENDING');

  const orderId = created.id;

  // Step 2: Pay
  const payRes = await api.post(`/v1/orders/${orderId}/pay`);
  expect(payRes.status()).toBe(200);

  const paid = await payRes.json();
  expect(paid.status).toBe('PAID');

  // Step 3: Ship
  const shipRes = await api.post(`/v1/orders/${orderId}/ship`);
  expect(shipRes.status()).toBe(200);

  const shipped = await shipRes.json();
  expect(shipped.status).toBe('SHIPPED');

  // Step 4: Read-back consistency
  const getRes = await api.get(`/v1/orders/${orderId}`);
  expect(getRes.status()).toBe(200);

  const fetched = await getRes.json();
  expect(fetched.status).toBe('SHIPPED');
});