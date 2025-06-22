const User = require('../models/user.model');
const { OK, CREATED } = require("../configs/response.config");
const authService = require("../services/auth.service");
const catchAsync = require("../utils/catchAsync");
const userEvents = require('../events/userEvents');
const APIError = require("../utils/APIError"); // ADD THIS LINE

class AuthController {
  register = catchAsync(async (req, res) => {
    // Log the received request body
    console.log('Registration request received with body:', JSON.stringify(req.body, null, 2));
    
    try {
      // Prepare user data for the service
      const userData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password,
        phoneNumber: req.body.phone, // Map phone to phoneNumber
        address: req.body.address,
        dob: req.body.dob,
        role: req.body.role || 'user' // Default role if not provided
      };
      
      // Call the auth service to register user
      const result = await authService.register(userData);
      
      // Check for success
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      // Return created response
      return CREATED(
        res,
        result.message || 'User registered successfully',
        {
          success: true,
          user: result.user
        }
      );
    } catch (error) {
      // Log detailed error info
      console.error('Registration error:', error.message);
      
      // Check for MongoDB duplicate key error
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        const value = error.keyValue[field];
        console.error(`Duplicate key error for field: ${field}, value: ${value}`);
        
        return res.status(400).json({
          success: false,
          errorType: `duplicate_${field}`,
          message: field === 'email' 
            ? 'This email address is already registered' 
            : field === 'phoneNumber' || field === 'phone'
              ? 'This phone number is already registered'
              : `The ${field} is already in use`
        });
      }
      
      // Check for validation errors
      if (error.name === 'ValidationError') {
        console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
        
        const validationErrors = {};
        Object.keys(error.errors).forEach(field => {
          validationErrors[field] = error.errors[field].message;
        });
        
        return res.status(400).json({
          success: false,
          errorType: 'validation_error',
          message: 'Validation failed',
          errors: validationErrors
        });
      }
      
      // Generic error
      console.error('Unexpected registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred during registration'
      });
    }
  });

  login = catchAsync(async (req, res) => {
    try {
      console.log('Login attempt for:', req.body.email);
      
      const result = await authService.loginWithEmail(req.body);
      console.log('Login result:', result);
      
      // Make sure the response format matches frontend expectations
      return OK(res, "Login successful", {
        success: true,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        userData: result.userData
      });
    } catch (error) {
      console.error("Login error:", error);
      
      if (error instanceof APIError) {
        return res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        errorType: 'server_error',
        message: 'An unexpected error occurred. Please try again later.'
      });
    }
  });

  refreshTokens = catchAsync(async (req, res) => {
    return OK(
      res,
      "Tokens refreshed successfully",
      await authService.generateNewTokens(req.body.refreshToken)
    );
  });

  // Verify email with token
  verifyEmail = catchAsync(async (req, res) => {
    const { token } = req.params;
    
    try {
      const user = await authService.verifyEmail(token);
      
      return OK(
        res,
        "Email verified successfully! You can now log in to your account.",
        {
          success: true,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          }
        }
      );
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // Resend verification email
  resendVerificationEmail = catchAsync(async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }
    
    try {
      const result = await authService.resendVerificationEmail(email);
      
      return OK(
        res,
        result.message,
        { success: true }
      );
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  requestPasswordReset = catchAsync(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await authService.requestPasswordReset(email);

    return OK(res, result.message, { success: result.success });
  });

  resetPassword = catchAsync(async (req, res) => {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, reset code, and new password are required",
      });
    }

    const result = await authService.resetPasswordWithCode({
      email,
      resetCode,
      newPassword
    });

    return OK(res, result.message, { success: result.success });
  });
}

module.exports = new AuthController();
