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
    console.log("Validation error details:", {
      url: req.url,
      method: req.method,
      body: req.body,
      errorDetails: error.details,
      errorMessage: error.message
    });
    
    const errorMessage = error.details
      .map((details) => details.message)
      .join(", ");
    const apiError = new APIError(400, errorMessage);
    apiError.errorCode = "VALIDATION_ERROR";
    apiError.errorType = "validation_error";
    return next(apiError);
  }

  if (value.params) Object.assign(req.params, value.params);
  if (value.query) Object.assign(req.query, value.query);
  if (value.body) Object.assign(req.body, value.body);
  return next();
};

module.exports = validate;
