const { OK, CREATED } = require("../configs/response.config");
const authService = require("../services/auth.service");
const catchAsync = require("../utils/catchAsync");
const userEvents = require('../events/userEvents');

class AuthController {
  register = catchAsync(async (req, res) => {
    const user = await authService.register(req.body);
    
    // Emit event after successful registration
    userEvents.emit('user:registered', user);
    
    return CREATED(
      res,
      "User registered successfully",
      user
    );
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
}

module.exports = new AuthController();
