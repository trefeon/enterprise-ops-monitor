const { ZodError } = require("zod");

function validatePart(schema, value) {
  if (!schema) return value;
  return schema.parse(value);
}

/**
 * Validate request parts using Zod.
 *
 * @param {{ body?: any, query?: any, params?: any }} schemas
 */
module.exports = function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas?.params) req.params = validatePart(schemas.params, req.params);
      if (schemas?.query) req.query = validatePart(schemas.query, req.query);
      if (schemas?.body) req.body = validatePart(schemas.body, req.body);
      return next();
    } catch (err) {
      if (err instanceof ZodError) return next(err);
      return next(err);
    }
  };
};
