import { test, expect } from '../fixtures/api.fixture';
import { expectStandardError } from './error.contract';

const RUN_MS_CONTRACTS = process.env.RUN_MS_CONTRACTS === 'true';

(RUN_MS_CONTRACTS ? test : test.skip)(
  'GET /v1/orders returns standard error for invalid filter',
  async ({ api }) => {
    const res = await api.get('/v1/orders?status=INVALID_STATUS');
    expect(res.status()).toBe(400);

    const err = await expectStandardError(res);
    expect(err.code).toBeTruthy();
  }
);