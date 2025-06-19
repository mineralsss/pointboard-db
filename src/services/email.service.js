const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    // Initialize SendGrid with API key
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.configured = true;
      console.log('SendGrid email service initialized');
    } else {
      console.warn('SENDGRID_API_KEY not found. Email services disabled.');
      this.configured = false;
    }
  }
  
  /**
   * Send an email using SendGrid
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} htmlBody - HTML content of the email
   * @param {string} [plainTextBody] - Optional plain text version
   * @returns {Promise<Object>} - Response from the API
   */
  async sendEmail(to, subject, htmlBody, plainTextBody = '') {
    if (!this.configured) {
      console.warn('Email service not configured. Skipping email send to:', to);
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      const msg = {
        to,
        from: process.env.FROM_EMAIL || 'noreply@pointboard.com', // Must be verified in SendGrid
        subject,
        html: htmlBody,
        text: plainTextBody || htmlBody.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
      };
      
      await sgMail.send(msg);
      console.log(`Email sent successfully to ${to}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();