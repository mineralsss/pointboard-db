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

router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// New route: Reset password with token (from reset link)
router.post('/reset-password/:token', 
  validate(authValidation.resetPasswordWithToken), 
  authController.resetPasswordWithToken
);

// Alternative routes for backward compatibility with reset codes
router.post('/forgot-password-code', authController.requestPasswordResetWithCode);
router.post('/reset-password-code', 
  validate(authValidation.resetPasswordWithCode), 
  authController.resetPassword
);

// Email verification routes
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);

module.exports = router;
