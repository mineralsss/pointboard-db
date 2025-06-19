const EventEmitter = require('events');
const emailService = require('../services/email.service');
const emailTemplates = require('../utils/emailTemplates');

const userEvents = new EventEmitter();

// Listen for user registration events
userEvents.on('user:registered', async (user) => {
  try {
    if (!user || !user.email) {
      console.error('Cannot send welcome email: Invalid user data');
      return;
    }
    
    console.log(`Sending welcome email to: ${user.email}`);
    
    await emailService.sendEmail(
      user.email,
      'Welcome to PointBoard!',
      emailTemplates.welcomeEmail(user.name || 'Valued Customer')
    );
    
    console.log(`Welcome email sent to: ${user.email}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't throw the error, just log it to prevent disrupting the flow
  }
});

module.exports = userEvents;