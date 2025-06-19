const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authValidation = require("../validations/auth.validation");
const validate = require("../middlewares/validate.middleware");

router.post(
  "/register",
  validate(authValidation.register),
  authController.register
);

router.post("/login", validate(authValidation.login), authController.login);

router.post(
  "/refresh-tokens",
  validate(authValidation.refreshTokens),
  authController.refreshTokens
);

module.exports = router;
