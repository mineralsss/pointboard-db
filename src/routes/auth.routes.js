// Add these routes to your auth routes

router.post('/forgot-password', validate(authValidation.forgotPassword), authController.requestPasswordReset);
router.post('/reset-password', validate(authValidation.resetPassword), authController.resetPassword);