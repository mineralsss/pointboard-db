const Joi = require("joi");

const register = {
  body: Joi.object().keys({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    phone: Joi.string().optional(),
    address: Joi.string().optional(),
    dob: Joi.date().optional(),
    role: Joi.string().valid("student", "instructor", "admin").optional(),
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {
  body: Joi.object().keys({
    token: Joi.string().required(),
    password: Joi.string().min(8).required(),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({ "any.only": "Passwords do not match" }),
  }),
};

// New validation for reset password with token from URL params
const resetPasswordWithToken = {
  params: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    newPassword: Joi.string().min(6).required(),
  }),
};

// Validation for reset password with code (backward compatibility)
const resetPasswordWithCode = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    resetCode: Joi.string().length(6).required(),
    newPassword: Joi.string().min(6).required(),
  }),
};

module.exports = {
  register,
  login,
  refreshTokens,
  forgotPassword,
  resetPassword,
  resetPasswordWithToken,
  resetPasswordWithCode,
};
