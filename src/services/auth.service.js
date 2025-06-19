const User = require("../models/user.model");
const APIError = require("../utils/APIError");
const userRepo = require("../repositories/user.repo");
const { createTokenPair } = require("../utils/token");
const _ = require("lodash");
const bcrypt = require("bcryptjs");
const { verifyJwt } = require("../utils/token");
const config = require("../configs/app.config");
const userEvents = require('../events/userEvents');
const crypto = require('crypto');
const emailService = require('./email.service');
const emailTemplates = require('../utils/emailTemplates');

class AuthService {
  register = async (userData) => {
    try {
      // Check if email already exists
      const existingEmail = await User.findOne({ email: userData.email });
      if (existingEmail) {
        return {
          success: false,
          errorType: 'duplicate_email',
          message: 'This email address is already registered'
        };
      }
      
      // Check if phone number already exists (if applicable)
      if (userData.phoneNumber) {
        const existingPhone = await User.findOne({ phoneNumber: userData.phoneNumber });
        if (existingPhone) {
          return {
            success: false,
            errorType: 'duplicate_phone',
            message: 'This phone number is already registered'
          };
        }
      }
      
      // Create user
      const user = await User.create({
        name: userData.name,
        email: userData.email,
        password: await bcrypt.hash(userData.password, 10),
        phoneNumber: userData.phoneNumber,
        // other fields...
      });
      
      // Generate auth tokens
      const tokens = this.generateAuthTokens(user);
      
      // Emit registration event for email notifications
      userEvents.emit('user:registered', user);
      
      return {
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber
        },
        tokens
      };
    } catch (error) {
      // Handle MongoDB duplicate key errors explicitly
      if (error.code === 11000) {
        const keyPattern = error.keyPattern;
        
        if (keyPattern.email) {
          return {
            success: false,
            errorType: 'duplicate_email',
            message: 'This email address is already registered'
          };
        }
        
        if (keyPattern.phoneNumber) {
          return {
            success: false,
            errorType: 'duplicate_phone',
            message: 'This phone number is already registered'
          };
        }
        
        return {
          success: false,
          errorType: 'duplicate_field',
          message: 'A duplicate field was detected'
        };
      }
      
      throw error; // Pass other errors to the controller
    }
  };

  loginWithEmail = async ({ email, password }) => {
    const user = await userRepo.getByEmail(email);
    if (!user) {
      throw new APIError(400, "Email does not exist");
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new APIError(400, "Email or password is incorrect");
    }

    if (!user.isActive) {
      throw new APIError(400, "Your account has been blocked");
    }

    const tokens = await createTokenPair({
      userID: user._id,
    });
    return {
      ...tokens,
      userData: _.pick(user, [
        "_id",
        "email",
        "firstName",
        "lastName",
        "role",
        "avatar",
        "balance",
      ]),
    };
  };

  generateNewTokens = async (refreshToken) => {
    const decodedJwt = verifyJwt(refreshToken, config.JWT.secretKey);

    const tokens = await createTokenPair({
      userID: decodedJwt.userID,
    });
    return tokens;
  };

  async requestPasswordReset(email) {
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      // Don't reveal whether email exists for security reasons
      return { success: true };
    }
    
    // Generate random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token and store in database
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Set token and expiry (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    
    await user.save();
    
    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    // Send email
    try {
      await emailService.sendEmail(
        user.email,
        'Reset Your PointBoard Password',
        emailTemplates.passwordResetEmail(user.name, resetUrl)
      );
      
      return { success: true };
    } catch (error) {
      // Roll back token if email fails
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      
      throw new Error('Failed to send password reset email');
    }
  }

  async resetPassword(token, newPassword) {
    // Hash the token for comparison with stored token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user with valid token that hasn't expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      throw new Error('Invalid or expired token');
    }
    
    // Update password and clear reset fields
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    
    await user.save();
    
    return { success: true };
  }
}

module.exports = new AuthService();

