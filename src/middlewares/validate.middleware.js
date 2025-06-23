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
    
    // Return validation error in consistent format instead of throwing
    return res.status(400).json({
      success: false,
      errorType: 'validation_error',
      message: 'Validation failed',
      errors: errorMessage
    });
  }

  Object.assign(req, value);
  return next();
};

module.exports = validate;
