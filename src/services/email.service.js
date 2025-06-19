const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
require('isomorphic-fetch');

class EmailService {
  constructor() {
    // Load config from environment variables
    this.tenantId = process.env.MS_TENANT_ID;
    this.clientId = process.env.MS_CLIENT_ID;
    this.clientSecret = process.env.MS_CLIENT_SECRET;
    this.userEmail = process.env.MS_USER_EMAIL;
    
    // Initialize the authentication provider
    this.credential = new ClientSecretCredential(
      this.tenantId,
      this.clientId,
      this.clientSecret
    );
    
    // Initialize Microsoft Graph client
    this.client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const response = await this.credential.getToken(['https://graph.microsoft.com/.default']);
          return response.token;
        }
      }
    });
  }
  
  /**
   * Send an email using Microsoft Graph API
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} htmlBody - HTML content of the email
   * @param {string} [plainTextBody] - Optional plain text version
   * @returns {Promise<Object>} - Response from the API
   */
  async sendEmail(to, subject, htmlBody, plainTextBody = '') {
    try {
      const email = {
        message: {
          subject,
          body: {
            contentType: 'HTML',
            content: htmlBody
          },
          toRecipients: [
            {
              emailAddress: {
                address: to
              }
            }
          ]
        },
        saveToSentItems: true
      };
      
      const response = await this.client
        .api(`/users/${this.userEmail}/sendMail`)
        .post(email);
        
      console.log(`Email sent successfully to ${to}`);
      return { success: true, response };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Send an email with attachment
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} htmlBody - HTML content
   * @param {Array} attachments - Array of attachment objects
   * @returns {Promise<Object>} - Response from the API
   */
  async sendEmailWithAttachments(to, subject, htmlBody, attachments = []) {
    try {
      const email = {
        message: {
          subject,
          body: {
            contentType: 'HTML',
            content: htmlBody
          },
          toRecipients: [
            {
              emailAddress: {
                address: to
              }
            }
          ],
          attachments: attachments.map(attachment => ({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: attachment.filename,
            contentType: attachment.contentType,
            contentBytes: attachment.content // Base64 encoded content
          }))
        },
        saveToSentItems: true
      };
      
      const response = await this.client
        .api(`/users/${this.userEmail}/sendMail`)
        .post(email);
        
      return { success: true, response };
    } catch (error) {
      console.error('Error sending email with attachments:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();