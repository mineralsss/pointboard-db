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
      // Reduce email size by minifying HTML if it's large
      const compactHtml = htmlBody.length > 10000 ? 
        htmlBody.replace(/\s+/g, ' ').replace(/>\s+</g, '><') : htmlBody;
      
      // Generate plain text only if not provided (optimize)
      const plainText = plainTextBody || 
        compactHtml.replace(/<br\s*\/?>/gi, '\n')
                   .replace(/<\/p>/gi, '\n\n')
                   .replace(/<[^>]*>/g, '');
      
      const msg = {
        to,
        from: process.env.FROM_EMAIL || 'noreply@pointboard.com',
        subject,
        html: compactHtml,
        text: plainText,
        // Add these optimization flags for SendGrid
        tracking_settings: {
          click_tracking: { enable: false },
          open_tracking: { enable: false }
        }
      };
      
      // Use the reliable approach - waiting for the actual send
      await sgMail.send(msg);
      
      const endTime = Date.now();
      console.log(`Email sent successfully to ${to} in ${endTime - startTime}ms`);
      return { success: true };
    } catch (error) {
      const endTime = Date.now();
      console.error(`Error sending email to ${to} (${endTime - startTime}ms):`, error);
      
      // Detailed error logging
      if (error.response) {
        console.error('SendGrid API error details:', {
          statusCode: error.response.statusCode,
          body: error.response.body,
          headers: error.response.headers
        });
      }
      
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();