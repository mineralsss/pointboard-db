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
    
    const startTime = Date.now();
    console.log(`Starting email send to ${to} at ${new Date().toISOString()}`);
    
    try {
      const msg = {
        to,
        from: process.env.FROM_EMAIL || 'noreply@pointboard.com', // Must be verified in SendGrid
        subject,
        html: htmlBody,
        text: plainTextBody || htmlBody.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
      };
      
      // Use non-blocking send (don't await if not needed for response)
      const sendPromise = sgMail.send(msg);
      
      // Log the success but don't wait for it to complete the function
      sendPromise.then(() => {
        const endTime = Date.now();
        console.log(`Email sent successfully to ${to} in ${endTime - startTime}ms`);
      }).catch(err => {
        console.error(`Error sending email to ${to}:`, err);
      });
      
      // Return early while sending continues in background
      return { success: true, message: 'Email sending initiated' };
    } catch (error) {
      const endTime = Date.now();
      console.error(`Error preparing email to ${to} (${endTime - startTime}ms):`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();