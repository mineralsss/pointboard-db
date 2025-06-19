const { OK, CREATED } = require("../configs/response.config");
const authService = require("../services/auth.service");
const catchAsync = require("../utils/catchAsync");
const userEvents = require('../events/userEvents');

class AuthController {
  register = catchAsync(async (req, res) => {
    // Extract data properly
    const { name, email, password } = req.body;
    
    // Validate email is present
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Create user (your existing code)
    const user = await User.create({
      name, 
      email,
      password
      // other fields...
    });
    
    // Send welcome email with proper logging
    try {
      console.log(`Attempting to send welcome email to: ${email}`);
      
      await emailService.sendEmail(
        email, // Make sure email is defined
        'Welcome to PointBoard!',
        emailTemplates.welcomeEmail(name || 'Valued Customer')
      );
      
      console.log(`Welcome email successfully sent to: ${email}`);
    } catch (emailError) {
      console.error(`Failed to send welcome email to ${email}:`, emailError);
    }
    
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
