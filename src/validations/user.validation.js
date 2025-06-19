const Joi = require('joi');
const roleConfig = require('../configs/role.config');

const changePassword = {
  body: Joi.object().keys({
    oldPassword: Joi.string().required().min(8),
    newPassword: Joi.string().required().min(8),
  }),
};
const changeProfile = {
  body: Joi.object().keys({
    firstName: Joi.string(),
    lastName: Joi.string(),
    address: Joi.string(),
    phone: Joi.string(),
    dob: Joi.date(),
    certificate: Joi.array().items(Joi.string().uri()),
  }),
};

const updateUserData = {
  body: Joi.object().keys({
    firstName: Joi.string(),
    lastName: Joi.string(),
    address: Joi.string(),
    phone: Joi.string(),
    dob: Joi.date(),
    role: Joi.string(),
    isVerified: Joi.boolean(),
    isActive: Joi.boolean(),
  }),
};

const changeActiveStatus = {
  params: Joi.object().keys({
    userId: Joi.string().required().trim(),
  }),
  body: Joi.object().keys({
    isActive: Joi.boolean().required(),
  }),
};

const subscribeValidation = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

module.exports = {
  changePassword,
  changeProfile,
  updateUserData,
  changeActiveStatus,
  subscribeValidation,
};
