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
const roles = require('../configs/role.config');
const { setImmediate } = require('timers');

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
      await User.findByIdAndUpdate(user._id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      });

      // Create verification URL
      const verificationUrl = `${process.env.FRONTEND_URL || 'https://pointboard.vercel.app'}/verify-email/${verificationToken}`;

      // Send welcome email with verification link
      const result = await emailService.sendEmail(
        user.email,
        'Welcome to PointBoard - Verify Your Email',
        emailTemplates.welcomeEmail(`${user.firstName} ${user.lastName}`, verificationUrl)
      );

      return result.success;
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false; // Don't throw error, just return false to indicate failure
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
      console.log(`Attempting to resend verification email to: ${email}`);
      const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpires');
      
      if (!user) {
        console.log(`User not found with email: ${email}`);
        throw new APIError(404, 'User not found');
      }

      if (user.isVerified) {
        console.log(`Email already verified for user: ${email}`);
        throw new APIError(400, 'Email is already verified');
      }

      // Generate new verification token
      const verificationToken = this.generateEmailVerificationToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update verification token
      console.log(`Updating verification token for user: ${user._id}`);
      await User.findByIdAndUpdate(user._id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      });

      // Create verification URL
      const verificationUrl = `${process.env.FRONTEND_URL || 'https://pointboard.vercel.app'}/verify-email/${verificationToken}`;
      console.log(`Verification URL generated: ${verificationUrl}`);

      // Send verification email directly
      console.log(`Sending verification email to: ${user.email}`);
      const result = await emailService.sendEmail(
        user.email,
        'Welcome to PointBoard - Verify Your Email',
        emailTemplates.welcomeEmail(`${user.firstName} ${user.lastName}`, verificationUrl)
      );
      
      console.log(`Email sending result: ${result.success ? 'succeeded' : 'failed'}`);
      
      if (!result.success) {
        console.error(`Failed to send verification email: ${result.error}`);
        throw new APIError(500, 'Failed to send verification email. Please try again later.');
      }

      return { 
        message: 'Verification email sent successfully',
        success: true
      };
    } catch (error) {
      console.error('Error in resendVerificationEmail:', error);
      throw error;
    }
  };

  register = async (userData) => {
    try {
      // Prepare user data
      const userToCreate = {
        email: userData.email,
        password:userData.password,
        phoneNumber: userData.phoneNumber || userData.phone, // Accept either field name
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || roles.STUDENT, // Default to student
        address: userData.address,
        dob: userData.dob,
        isVerified: false, // Start as unverified
      };

      console.log('Creating user with data:', {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName
      });

      // Create user with all required fields
      const user = await User.create(userToCreate);
      console.log(`User created with ID: ${user._id}`);
      
      // Generate tokens
      const tokens = await createTokenPair({ userID: user._id });
      
      // Send verification email - do await to ensure it's sent
      console.log(`Sending verification email to ${user.email}`);
      const emailSent = await this.sendVerificationEmail(user);
      console.log(`Email sending status: ${emailSent ? 'succeeded' : 'failed'}`);
      
      return {
        success: true,
        user: {
          id: user._id,
          name: user.name || `${user.firstName} ${user.lastName}`,
          email: user.email,
          phoneNumber: user.phone
        },
        tokens,
        emailSent,
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
        
        if (keyPattern.phone) {
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
    console.log(`[LOGIN] Attempting login for: ${email}`);
    
    // Find user by email
    const user = await userRepo.getByEmail(email);
    if (!user) {
      console.log(`[LOGIN] User not found: ${email}`);
      throw new APIError(400, "Email does not exist");
    }

    console.log(`[LOGIN] User found - ID: ${user._id}, Has password: ${!!user.password}`);
    
    // Check if password field exists
    if (!user.password) {
      console.log(`[LOGIN] No password field found for user: ${email}`);
      throw new APIError(400, "Email or password is incorrect");
    }

    // Check password
    console.log(user.password);
    const isPasswordMatch = await bcrypt.compareSync(password, user.password);
    
    console.log(`[LOGIN] Password match result: ${isPasswordMatch} for user: ${email}`);
    
    if (!isPasswordMatch) {
      throw new APIError(400, "Email or password is incorrect");
    }

    // Verify account is active
    if (!user.isActive) {
      console.log(`[LOGIN] Account inactive for user: ${email}`);
      throw new APIError(400, "Your account has been blocked");
    }

    console.log(`[LOGIN] Login successful for: ${email}`);

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

  // Generate password reset token (similar to email verification token)
  generatePasswordResetToken = () => {
    return crypto.randomBytes(32).toString('hex');
  };

  // Step 1: Send reset link to email
  requestPasswordReset = async (email) => {
    try {
      console.log(`Password reset requested for email: ${email}`);
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if email exists or not for security
        console.log(`No user found with email: ${email}`);
        return {
          success: true,
          message: "If an account with this email exists, a reset link has been sent."
        };
      }

      // Generate password reset token
      const resetToken = this.generatePasswordResetToken();
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token to user
      await User.findByIdAndUpdate(user._id, {
        resetPasswordToken: resetToken,
        resetPasswordTokenExpires: resetTokenExpires
      });

      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL || 'https://pointboard.vercel.app'}/reset-password/${resetToken}`;

      // Send reset link email
      console.log(`Sending password reset link to: ${email}`);
      const result = await emailService.sendEmail(
        user.email,
        'Reset Your Password - PointBoard',
        emailTemplates.passwordResetEmail(user.firstName, resetUrl)
      );

      if (!result.success) {
        console.error(`Failed to send password reset email: ${result.error}`);
        throw new APIError(500, 'Failed to send reset link. Please try again later.');
      }

      console.log(`Password reset link sent successfully to: ${email}`);
      return {
        success: true,
        message: "Reset link sent to your email address."
      };
    } catch (error) {
      console.error('Error in requestPasswordReset:', error);
      throw new APIError(500, 'Failed to process password reset request');
    }
  };

  // Step 1 Alternative: Send reset code to email (keeping for backward compatibility)
  requestPasswordResetWithCode = async (email) => {
    try {
      console.log(`Password reset requested for email: ${email}`);
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if email exists or not for security
        console.log(`No user found with email: ${email}`);
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
      console.log(`Sending password reset code to: ${email}`);
      const result = await emailService.sendEmail(
        user.email,
        'Password Reset Code - PointBoard',
        emailTemplates.passwordResetCodeEmail(user.firstName, resetCode)
      );

      if (!result.success) {
        console.error(`Failed to send password reset email: ${result.error}`);
        throw new APIError(500, 'Failed to send reset code. Please try again later.');
      }

      console.log(`Password reset code sent successfully to: ${email}`);
      return {
        success: true,
        message: "Reset code sent to your email address."
      };
    } catch (error) {
      console.error('Error in requestPasswordResetWithCode:', error);
      throw new APIError(500, 'Failed to process password reset request');
    }
  };

  // Step 2: Verify token and reset password (new method for reset links)
  resetPasswordWithToken = async ({ token, newPassword }) => {
    try {
      // Find user with valid reset token
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordTokenExpires: { $gt: new Date() }
      });

      if (!user) {
        throw new APIError(400, 'Invalid or expired reset token');
      }

      // Validate new password
      if (!newPassword || newPassword.length < 6) {
        throw new APIError(400, 'Password must be at least 6 characters long');
      }

      // Hash new password and clear reset fields
      const hashedPassword = await bcrypt.hashSync(newPassword, 10);
      
      await User.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordTokenExpires: undefined
      });

      // Send confirmation email
      console.log(`Sending password reset success email to: ${user.email}`);
      const result = await emailService.sendEmail(
        user.email,
        'Password Reset Successful - PointBoard',
        emailTemplates.passwordResetSuccessEmail(user.firstName)
      );

      if (!result.success) {
        console.error(`Failed to send password reset success email: ${result.error}`);
        // Continue despite email failure since password was reset
      } else {
        console.log(`Password reset success email sent to: ${user.email}`);
      }

      return {
        success: true,
        message: "Password reset successfully"
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error in resetPasswordWithToken:', error);
      throw new APIError(500, 'Failed to reset password');
    }
  };

  // Step 2: Verify code and reset password (keeping for backward compatibility)
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
      const hashedPassword = await bcrypt.hashSync(newPassword, 10);
      
      await User.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        resetPasswordCode: undefined,
        resetPasswordExpires: undefined
      });

      // Send confirmation email
      console.log(`Sending password reset success email to: ${email}`);
      const result = await emailService.sendEmail(
        user.email,
        'Password Reset Successful - PointBoard',
        emailTemplates.passwordResetSuccessEmail(user.firstName)
      );

      if (!result.success) {
        console.error(`Failed to send password reset success email: ${result.error}`);
        // Continue despite email failure since password was reset
      } else {
        console.log(`Password reset success email sent to: ${email}`);
      }

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

