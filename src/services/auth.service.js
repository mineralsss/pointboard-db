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
  // Generate email verification token
  generateEmailVerificationToken = () => {
    return crypto.randomBytes(32).toString('hex');
  };

  // Send verification email
  sendVerificationEmail = async (user) => {
    try {
      const verificationToken = this.generateEmailVerificationToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Save verification token to user
      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpires = verificationExpires;
      await user.save();

      // Create verification URL
      const verificationUrl = `${process.env.FRONTEND_URL || 'https://pointboard.vercel.app'}/verify-email?token=${verificationToken}`;

      // Send welcome email with verification link
      await emailService.sendEmail({
        to: user.email,
        subject: 'Welcome to PointBoard - Verify Your Email',
        html: emailTemplates.welcomeEmail(`${user.firstName} ${user.lastName}`, verificationUrl)
      });

      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new APIError(500, 'Failed to send verification email');
    }
  };

  // Verify email with token
  verifyEmail = async (token) => {
    try {
      const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: Date.now() }
      }).select('+emailVerificationToken +emailVerificationExpires');

      if (!user) {
        throw new APIError(400, 'Invalid or expired verification token');
      }

      // Mark user as verified
      user.isVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      return user;
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  };

  // Resend verification email
  resendVerificationEmail = async (email) => {
    try {
      const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpires');
      
      if (!user) {
        throw new APIError(404, 'User not found');
      }

      if (user.isVerified) {
        throw new APIError(400, 'Email is already verified');
      }

      // Generate new verification token
      const verificationToken = this.generateEmailVerificationToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update verification token
      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpires = verificationExpires;
      await user.save();

      // Create verification URL
      const verificationUrl = `${process.env.FRONTEND_URL || 'https://pointboard.vercel.app'}/verify-email?token=${verificationToken}`;

      // Send welcome email with verification link
      await emailService.sendEmail({
        to: user.email,
        subject: 'Welcome to PointBoard - Verify Your Email',
        html: emailTemplates.welcomeEmail(`${user.firstName} ${user.lastName}`, verificationUrl)
      });

      return { message: 'Verification email sent successfully' };
    } catch (error) {
      console.error('Error resending verification email:', error);
      throw error;
    }
  };

  register = async (userData) => {
    try {
      // Prepare user data
      const userToCreate = {
        email: userData.email,
        password: await bcrypt.hash(userData.password, 10),
        phoneNumber: userData.phoneNumber,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        address: userData.address,
        dob: userData.dob,
        isVerified: false, // Start as unverified
      };

      // Create user with all required fields
      const user = await User.create(userToCreate);
      
      // Send verification email
      await this.sendVerificationEmail(user);
      
      // Generate auth tokens (but user won't be able to use them until verified)
      const tokens = this.generateAuthTokens(user);
      
      // Make sure to pass the complete name to the email event
      const fullName = `${user.firstName} ${user.lastName}`;
      
      // Emit event with proper name
      userEvents.emit('user:registered', {
        ...user._doc, // or user.toObject()
        name: fullName // Add the full name explicitly
      });
      
      return {
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber
        },
        tokens,
        message: 'Registration successful. Please check your email to verify your account.'
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
        
        // Replace generic message with phone number specific message
        // This assumes most duplicates are likely phone numbers if not caught above
        return {
          success: false,
          errorType: 'duplicate_phone',
          message: 'This phone number is already registered'
        };
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        console.log('Validation error details:', error.errors);
        
        // Return user-friendly error messages
        return {
          success: false,
          errorType: 'validation_error',
          message: 'Please check your registration details',
          errors: Object.fromEntries(
            Object.entries(error.errors).map(([field, err]) => 
              [field, err.message.replace('Path', 'Field')]
            )
          )
        };
      }
      
      throw error; // Pass other errors to the controller
    }
  };

  loginWithEmail = async ({ email, password }) => {
    // Find user by email
    const user = await userRepo.getByEmail(email);
    if (!user) {
      throw new APIError(400, "Email does not exist");
    }

    // Check password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new APIError(400, "Email or password is incorrect");
    }

    // Verify account is active
    if (!user.isActive) {
      throw new APIError(400, "Your account has been blocked");
    }

    // Generate tokens
    const tokens = await createTokenPair({
      userID: user._id,
    });
    
    // Return tokens and user data
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

  // Generate a 6-digit reset code
  generateResetCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Step 1: Send reset code to email
  requestPasswordReset = async (email) => {
    try {
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if email exists or not for security
        return {
          success: true,
          message: "If an account with this email exists, a reset code has been sent."
        };
      }

      // Generate 6-digit reset code
      const resetCode = this.generateResetCode();
      const resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Save reset code to user
      await User.findByIdAndUpdate(user._id, {
        resetPasswordCode: resetCode,
        resetPasswordExpires: resetCodeExpires
      });

      // Send reset code email
      await emailService.sendEmail(
        user.email,
        'Password Reset Code - PointBoard',
        emailTemplates.passwordResetCodeEmail(user.firstName, resetCode)
      );

      console.log(`Password reset code sent to: ${email}`);

      return {
        success: true,
        message: "Reset code sent to your email address."
      };
    } catch (error) {
      console.error('Error in requestPasswordReset:', error);
      throw new APIError(500, 'Failed to process password reset request');
    }
  };

  // Step 2: Verify code and reset password
  resetPasswordWithCode = async ({ email, resetCode, newPassword }) => {
    try {
      // Find user with valid reset code
      const user = await User.findOne({
        email,
        resetPasswordCode: resetCode,
        resetPasswordExpires: { $gt: new Date() }
      });

      if (!user) {
        throw new APIError(400, 'Invalid or expired reset code');
      }

      // Validate new password
      if (!newPassword || newPassword.length < 6) {
        throw new APIError(400, 'Password must be at least 6 characters long');
      }

      // Hash new password and clear reset fields
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await User.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        resetPasswordCode: undefined,
        resetPasswordExpires: undefined
      });

      // Send confirmation email
      await emailService.sendEmail(
        user.email,
        'Password Reset Successful - PointBoard',
        emailTemplates.passwordResetSuccessEmail(user.firstName)
      );

      console.log(`Password reset successful for: ${email}`);

      return {
        success: true,
        message: "Password reset successfully"
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error in resetPasswordWithCode:', error);
      throw new APIError(500, 'Failed to reset password');
    }
  };
}

module.exports = new AuthService();

