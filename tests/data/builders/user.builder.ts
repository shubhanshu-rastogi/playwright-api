import { CreateUserPayload } from '../types/user';

export const buildCreateUserPayload = (
  overrides: Partial<CreateUserPayload> = {}
): CreateUserPayload => ({
  name: `user_${Date.now()}`,
  job: 'qa',
  ...overrides,
});