const nodemailer = require('nodemailer');

// Configure transporter for Outlook
const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    ciphers: 'SSLv3'
  }
});

// Test the connection on startup
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('Outlook SMTP server is ready to send emails');
  }
});

const sendWelcomeEmail = async (userEmail, username) => {
  console.log(`Preparing email to send to: ${userEmail}`);
  
  const mailOptions = {
    from: `"PointBoard Team" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: 'Welcome to PointBoard!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #39095D;">Welcome to PointBoard!</h2>
        <p>Hello ${username || 'there'},</p>
        <p>Thank you for registering with PointBoard. Your account has been successfully created!</p>
        <p>You can now log in and start exploring our platform.</p>
        <p>Best regards,<br>The PointBoard Team</p>
      </div>
    `
  };

  try {
    console.log('Sending email now...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail
};