const { OK, CREATED } = require("../configs/response.config");
const authService = require("../services/auth.service");
const catchAsync = require("../utils/catchAsync");

class AuthController {
  register = catchAsync(async (req, res) => {
    const result = await authService.register(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        errorType: result.errorType,
        message: result.message,
      });
    }

    return CREATED(res, "User registered successfully", result);
  });

  login = catchAsync(async (req, res) => {
    return OK(
      res,
      "Login successful",
      await authService.loginWithEmail(req.body)
    );
  });

  refreshTokens = catchAsync(async (req, res) => {
    return OK(
      res,
      "Tokens refreshed successfully",
      await authService.generateNewTokens(req.body.refreshToken)
    );
  });

  requestPasswordReset = catchAsync(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    await authService.requestPasswordReset(email);

    // Always return success to prevent email enumeration attacks
    return OK(
      res,
      "Password reset email sent if account exists",
      { success: true }
    );
  });

  resetPassword = catchAsync(async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Token and password are required",
      });
    }

    await authService.resetPassword(token, password);

    return OK(res, "Password successfully reset", { success: true });
  });
}

module.exports = new AuthController();
