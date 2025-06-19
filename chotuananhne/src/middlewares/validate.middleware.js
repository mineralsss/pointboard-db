const Joi = require("joi");
const APIError = require("../utils/APIError");

const validate = (schema) => (req, res, next) => {
  const validSchema = {};
  ["params", "query", "body"].forEach((key) => {
    if (schema[key]) {
      validSchema[key] = req[key];
    }
  });

  const { value, error } = Joi.compile(schema).validate(validSchema);

  if (error) {
    const errorMessage = error.details
      .map((details) => details.message)
      .join(", ");
    return next(new APIError(400, errorMessage));
  }

  Object.assign(req, value);
  return next();
};

module.exports = validate;
