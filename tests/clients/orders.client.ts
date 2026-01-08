import { APIRequestContext, expect } from '@playwright/test';

export class OrdersClient {
  constructor(private api: APIRequestContext) {}

  async create(payload: { item: string; price: number }) {
    const res = await this.api.post('/v1/orders', { data: payload });
    expect(res.status(), 'create order').toBe(201);
    return res.json();
  }

  async pay(orderId: string) {
    const res = await this.api.post(`/v1/orders/${orderId}/pay`);
    expect(res.status(), 'pay order').toBe(200);
    return res.json();
  }

  async ship(orderId: string) {
    const res = await this.api.post(`/v1/orders/${orderId}/ship`);
    expect(res.status(), 'ship order').toBe(200);
    return res.json();
  }

  async get(orderId: string) {
    const res = await this.api.get(`/v1/orders/${orderId}`);
    expect(res.status(), 'get order').toBe(200);
    return res.json();
  }
}