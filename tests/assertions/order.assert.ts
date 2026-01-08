import { expect } from '@playwright/test';

type Order = {
  id?: string;
  status?: string;
};

export function expectOrder(order: Order) {
  return {
    toHaveId() {
      expect(order.id, 'order.id should exist').toBeTruthy();
    },

    toBeCreated() {
      expect(order.status, 'order.status').toBe('CREATED');
    },

    toBePaid() {
      expect(order.status, 'order.status').toBe('PAID');
    },

    toBeShipped() {
      expect(order.status, 'order.status').toBe('SHIPPED');
    }
  };
}