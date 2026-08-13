const { sendError } = require('../utils/response');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.flatten();
      return sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', details);
    }
    req[source] = result.data;
    next();
  };
};

module.exports = { validate };
