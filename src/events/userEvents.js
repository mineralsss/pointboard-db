const EventEmitter = require('events');
const emailService = require('../services/email.service');
const emailTemplates = require('../utils/emailTemplates');

// Create the event emitter
const userEvents = new EventEmitter();

// Listen for user registration events
userEvents.on('user:registered', async (user) => {
  try {
    if (!user || !user.email) {
      console.error('Cannot send welcome email: Invalid user data', user);
      return;
    }
    
    console.log(`Attempting to send welcome email to: ${user.email}`);
    
    await emailService.sendEmail(
      user.email,
      'Welcome to PointBoard!',
      emailTemplates.welcomeEmail(user.name || 'Valued Customer')
    );
    
    console.log(`Welcome email sent successfully to: ${user.email}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
});

module.exports = userEvents;