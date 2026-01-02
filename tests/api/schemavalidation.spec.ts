import { test, expect } from '../fixtures/api.fixture';
import { validateSchema } from '../contracts/validate';

const userSchema = {
  type: 'object',
  additionalProperties: true,
  required: ['id', 'name', 'job'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    job: { type: 'string' },
  },
} as const;

test('POST /api/users matches contract', async ({ api }) => {
  const res = await api.post('/api/users', { data: { name: 'john', job: 'qa' } });
  expect(res.status()).toBe(201);

  const body = await res.json();
  const result = validateSchema<any>(userSchema as any, body);

  expect(result.ok, result.errors.join('\n')).toBe(true);
});