import { test } from '../fixtures/api.fixture';
import { OrdersClient } from '../clients/orders.client';
import { expectOrder } from '../assertions/order.assert';

test('Order happy flow using client + assertion layer', async ({ api }) => {
  const orders = new OrdersClient(api);

  const created = await orders.create({ item: 'book', price: 20 });
  expectOrder(created).toHaveId();
  expectOrder(created).toBeCreated();

  const paid = await orders.pay(created.id);
  expectOrder(paid).toBePaid();

  const shipped = await orders.ship(created.id);
  expectOrder(shipped).toBeShipped();

  const final = await orders.get(created.id);
  expectOrder(final).toBeShipped();
});