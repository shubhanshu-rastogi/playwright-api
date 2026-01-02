export const userSchema = {
  type: 'object',
  required: ['id', 'name', 'job'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    job: { type: 'string' },
  },
};