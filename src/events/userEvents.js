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
    
    // FIX: Use firstName and lastName instead of user.name
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    
    await emailService.sendEmail(
      user.email,
      'Welcome to PointBoard!',
      emailTemplates.welcomeEmail(fullName || 'Customer')
    );
    
    console.log(`Welcome email sent to: ${user.email} with name: ${fullName}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't throw the error, just log it to prevent disrupting the flow
  }
});

module.exports = userEvents;