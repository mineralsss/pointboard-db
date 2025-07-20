const { Resend } = require('resend');

class EmailService {
  constructor() {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.configured = true;
      console.log('Resend email service initialized');
    } else {
      console.warn('RESEND_API_KEY not found. Email services disabled.');
      this.configured = false;
    }
  }

  /**
   * Send an email using Resend
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
        compactHtml.replace(/<br\s*\/?>(\n)?/gi, '\n')
                   .replace(/<\/p>/gi, '\n\n')
                   .replace(/<[^>]*>/g, '');

      const msg = {
        from: process.env.FROM_EMAIL || 'noreply@pointboard.site',
        to,
        subject,
        html: compactHtml,
        text: plainText,
      };

      // Use Resend to send the email
      await this.resend.emails.send(msg);

      const endTime = Date.now();
      console.log(`Email sent successfully to ${to} in ${endTime - startTime}ms`);
      return { success: true };
    } catch (error) {
      const endTime = Date.now();
      console.error(`Error sending email to ${to} (${endTime - startTime}ms):`, error);
      if (error.response) {
        console.error('Resend API error details:', error.response);
      }
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();