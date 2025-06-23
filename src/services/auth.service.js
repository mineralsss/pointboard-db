<<<<<<< HEAD
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
      await User.findByIdAndUpdate(user._id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      });

      // Create verification URL
      const verificationUrl = `${process.env.FRONTEND_URL || 'https://pointboard.vercel.app'}/verify-email/${verificationToken}`;

      // Send verification email directly
      const result = await emailService.sendEmail(
        user.email,
        'Welcome to PointBoard - Verify Your Email',
        emailTemplates.welcomeEmail(`${user.firstName} ${user.lastName}`, verificationUrl)
      );
      
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
      // Validate essential fields
      if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
        return {
          success: false,
          errorType: 'validation_error',
          message: 'Missing required fields'
        };
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        return {
          success: false,
          errorType: 'duplicate_email',
          message: 'This email address is already registered'
        };
      }

      // Check for phone number duplicates if provided and not empty
      const phoneNumber = userData.phoneNumber || userData.phone;
      if (phoneNumber && phoneNumber.trim() !== '') {
        const existingPhoneUser = await User.findOne({ phoneNumber: phoneNumber });
        if (existingPhoneUser) {
          return {
            success: false,
            errorType: 'duplicate_phone',
            message: 'This phone number is already registered'
          };
        }
      }

      // Prepare user data
      const userToCreate = {
        email: userData.email,
        password: await bcrypt.hash(userData.password, 10),
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || roles.STUDENT, // Default to student
        address: userData.address,
        dob: userData.dob,
        isVerified: false, // Start as unverified
      };

      // Only add phoneNumber if it has a value
      if (phoneNumber && phoneNumber.trim() !== '') {
        userToCreate.phoneNumber = phoneNumber;
      }

      // Create user with all required fields
      const user = await User.create(userToCreate);
      
      // Generate tokens
      const tokens = await createTokenPair({ userID: user._id });
      
      // Send verification email - do await to ensure it's sent
      const emailSent = await this.sendVerificationEmail(user);
      
      return {
        success: true,
        user: {
          id: user._id,
          name: user.name || `${user.firstName} ${user.lastName}`,
          email: user.email,
          phoneNumber: user.phoneNumber
        },
        tokens,
        emailSent,
        message: 'Registration successful. Please check your email to verify your account.'
      };
    } catch (error) {
      console.error('Auth service - Registration error:', error);
      
      // Handle MongoDB duplicate key errors explicitly
      if (error.code === 11000) {
        console.error('Auth service - Duplicate key error details:', error.keyPattern, error.keyValue);
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
        
        // Generic duplicate error
        return {
          success: false,
          errorType: 'duplicate_field',
          message: 'This information is already registered'
        };
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        console.error('Auth service - Validation error details:', error.errors);
        
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
      
      console.error('Auth service - Unexpected error during registration:', error);
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

    // Check if email is verified
    if (!user.isVerified) {
      throw new APIError(400, "Please verify your email address before logging in. Check your inbox for the verification link.");
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

  // Generate password reset token (similar to email verification token)
  generatePasswordResetToken = () => {
    return crypto.randomBytes(32).toString('hex');
  };

  // Step 1: Send reset link to email
  requestPasswordReset = async (email) => {
    try {
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if email exists or not for security
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
      const result = await emailService.sendEmail(
        user.email,
        'Reset Your Password - PointBoard',
        emailTemplates.passwordResetEmail(user.firstName, resetUrl)
      );

      if (!result.success) {
        console.error(`Failed to send password reset email: ${result.error}`);
        throw new APIError(500, 'Failed to send reset link. Please try again later.');
      }

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
      const result = await emailService.sendEmail(
        user.email,
        'Password Reset Code - PointBoard',
        emailTemplates.passwordResetCodeEmail(user.firstName, resetCode)
      );

      if (!result.success) {
        console.error(`Failed to send password reset email: ${result.error}`);
        throw new APIError(500, 'Failed to send reset code. Please try again later.');
      }

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
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await User.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordTokenExpires: undefined
      });

      // Send confirmation email
      const result = await emailService.sendEmail(
        user.email,
        'Password Reset Successful - PointBoard',
        emailTemplates.passwordResetSuccessEmail(user.firstName)
      );

      if (!result.success) {
        console.error(`Failed to send password reset success email: ${result.error}`);
        // Continue despite email failure since password was reset
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
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await User.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        resetPasswordCode: undefined,
        resetPasswordExpires: undefined
      });

      // Send confirmation email
      const result = await emailService.sendEmail(
        user.email,
        'Password Reset Successful - PointBoard',
        emailTemplates.passwordResetSuccessEmail(user.firstName)
      );

      if (!result.success) {
        console.error(`Failed to send password reset success email: ${result.error}`);
        // Continue despite email failure since password was reset
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

=======
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
      await User.findByIdAndUpdate(user._id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      });

      // Create verification URL
      const verificationUrl = `${process.env.FRONTEND_URL || 'https://pointboard.vercel.app'}/verify-email/${verificationToken}`;

      // Send email in the background without blocking
      setImmediate(() => {
        emailService.sendEmail(
          user.email,
          'Welcome to PointBoard - Verify Your Email',
          emailTemplates.welcomeEmail(`${user.firstName} ${user.lastName}`, verificationUrl)
        )
        .then(result => {
          console.log(`Resending verification email result: ${result.success ? 'success' : 'failed'}`);
        })
        .catch(err => {
          console.error('Error in background email sending:', err);
        });
      });

      return { message: 'Verification email sending initiated. Please check your inbox shortly.' };
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
        password: await bcrypt.hash(userData.password, 10),
        phone: userData.phoneNumber || userData.phone, // Accept either field name
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || roles.STUDENT, // Default to student
        address: userData.address,
        dob: userData.dob,
        isVerified: false, // Start as unverified
      };

      // Create user with all required fields
      const user = await User.create(userToCreate);
      
      // Generate tokens
      const tokens = await createTokenPair({ userID: user._id });
      
      // Send verification email asynchronously (don't wait/block)
      setImmediate(() => {
        this.sendVerificationEmail(user)
          .then(success => {
            if (success) {
              console.log(`Verification email sent successfully to ${user.email}`);
            } else {
              console.error(`Failed to send verification email to ${user.email}`);
            }
          })
          .catch(err => {
            console.error(`Error sending verification email to ${user.email}:`, err);
          });
      });
      
      return {
        success: true,
        user: {
          id: user._id,
          name: user.name || `${user.firstName} ${user.lastName}`,
          email: user.email,
          phoneNumber: user.phone
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

>>>>>>> parent of 95ae0bb (reset password)
