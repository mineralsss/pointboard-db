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
      // Check if email already exists before trying to create
      const existingEmail = await User.findOne({ email: req.body.email });
      if (existingEmail) {
        console.log(`Registration attempt with duplicate email: ${req.body.email}`);
        return res.status(400).json({
          success: false,
          errorType: 'duplicate_email',
          message: 'This email address is already registered'
        });
      }
      
      // Check if phone already exists (if provided)
      if (req.body.phone) {
        const existingPhone = await User.findOne({ phone: req.body.phone });
        if (existingPhone) {
          console.log(`Registration attempt with duplicate phone: ${req.body.phone}`);
          return res.status(400).json({
            success: false,
            errorType: 'duplicate_phone',
            message: 'This phone number is already registered'
          });
        }
      }
      
      // Log what we're about to create
      console.log('Creating user with data:', {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone || 'Not provided'
        // Don't log password for security reasons
      });
      
      // Create the user
      const user = await User.create({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password,
        phone: req.body.phone
        // Add other fields as needed
      });
      
      console.log(`User created successfully with ID: ${user._id}`);
      // Emit event for sending welcome email
      userEvents.emit('user:registered', user);
      console.log(`Registration event emitted for: ${user.email}`);
      
      // Return created response
      return CREATED(
        res,
        'User registered successfully',
        {
          success: true,
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          }
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
            : field === 'phone'
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
