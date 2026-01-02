import { expect } from '@playwright/test';

export type StandardError = {
  code: string;
  message: string;
  traceId: string;
  correlationId?: string;
  details?: any;
};

export async function expectStandardError(res: any) {
  const body = await res.json();

  expect(body).toHaveProperty('code');
  expect(typeof body.code).toBe('string');

  expect(body).toHaveProperty('message');
  expect(typeof body.message).toBe('string');

  expect(body).toHaveProperty('traceId');
  expect(typeof body.traceId).toBe('string');

  // optional but recommended
  if ('correlationId' in body) {
    expect(typeof body.correlationId).toBe('string');
  }

  return body as StandardError;
}