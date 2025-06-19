const EventEmitter = require('events');
const emailService = require('../services/email.service');
const emailTemplates = require('../utils/emailTemplates');

const userEvents = new EventEmitter();

// Listen for user registration events
userEvents.on('user:registered', async (user) => {
  try {
    await emailService.sendEmail(
      user.email,
      'Welcome to PointBoard!',
      emailTemplates.welcomeEmail(user.name)
    );
    console.log(`Welcome email sent to ${user.email}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
});

module.exports = userEvents;