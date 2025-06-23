const EventEmitter = require('events');
const emailService = require('../services/email.service');
const emailTemplates = require('../utils/emailTemplates');
const crypto = require('crypto');
const User = require('../models/user.model');

const userEvents = new EventEmitter();

// Listen for user registration events
userEvents.on('user:registered', async (user) => {
  try {
    if (!user || !user.email) {
      console.error('Cannot send welcome email: Invalid user data');
      return;
    }
    
    console.log(`[EVENT] Processing registration event for: ${user.email}`);
    
    // FIX: Use firstName and lastName instead of user.name
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Save verification token to database
    console.log(`[EVENT] Saving verification token for user: ${user._id}`);
    await User.findByIdAndUpdate(user._id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });
    
    // Create verification URL
    const verificationUrl = `${process.env.FRONTEND_URL || 'https://pointboard.vercel.app'}/verify-email/${verificationToken}`;
    console.log(`[EVENT] Verification URL generated: ${verificationUrl}`);
    
    // Send email with verification link
    console.log(`[EVENT] Sending welcome email to: ${user.email}`);
    const result = await emailService.sendEmail(
      user.email,
      'Welcome to PointBoard!',
      emailTemplates.welcomeEmail(fullName || 'Customer', verificationUrl)
    );
    
    if (result.success) {
      console.log(`[EVENT] Welcome email sent to: ${user.email}`);
    } else {
      console.error(`[EVENT] Failed to send welcome email to: ${user.email}`);
    }
  } catch (error) {
    console.error('[EVENT] Error in user registration event handler:', error);
    // Don't throw the error, just log it to prevent disrupting the flow
  }
});

module.exports = userEvents;