import Ajv, { type JSONSchemaType } from 'ajv';

const ajv = new Ajv({
  allErrors: true,
  strict: true,
});

export function validateSchema<T>(schema: JSONSchemaType<T>, data: unknown) {
  const validate = ajv.compile(schema);
  const ok = validate(data);

  return {
    ok: Boolean(ok),
    errors: validate.errors?.map(e => `${e.instancePath || '/'} ${e.message}`) ?? [],
  };
}