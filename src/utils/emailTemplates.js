/**
 * Generates HTML content for welcome email
 * @param {string} name - User's name
 * @param {string} verificationUrl - Optional account verification URL
 * @returns {string} - HTML email content
 */
exports.welcomeEmail = (name, verificationUrl = null) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #eee;
    }
    .header {
      background-color: #3498db;
      color: white;
      padding: 15px;
      text-align: center;
    }
    .content {
      padding: 20px;
    }
    .button {
      display: inline-block;
      background-color: #3498db;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 15px;
    }
    .footer {
      font-size: 12px;
      color: #777;
      text-align: center;
      margin-top: 30px;
      border-top: 1px solid #eee;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to PointBoard!</h1>
    </div>
    <div class="content">
      <h2>Hello ${name}!</h2>
      <p>Thank you for joining PointBoard. We're excited to have you as part of our community!</p>
      <p>With your new account, you can:</p>
      <ul>
        <li>Track your transactions and payments</li>
        <li>Access exclusive deals and promotions</li>
        <li>Manage your profile and preferences</li>
      </ul>
      ${verificationUrl ? 
        `<p>Please verify your email address by clicking the button below:</p>
         <a href="${verificationUrl}" class="button">Verify Email</a>` 
        : ''}
      <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
      <p>Best regards,<br>The PointBoard Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} PointBoard. All rights reserved.</p>
      <p>This email was sent to you because you registered on our platform.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Generates plain text version of welcome email (for clients that don't support HTML)
 * @param {string} name - User's name
 * @param {string} verificationUrl - Optional account verification URL
 * @returns {string} - Plain text email content
 */
exports.welcomeEmailText = (name, verificationUrl = null) => {
  return `
Welcome to PointBoard!

Hello ${name}!

Thank you for joining PointBoard. We're excited to have you as part of our community!

With your new account, you can:
- Track your transactions and payments
- Access exclusive deals and promotions
- Manage your profile and preferences

${verificationUrl ? `Please verify your email address by visiting: ${verificationUrl}` : ''}

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The PointBoard Team

© ${new Date().getFullYear()} PointBoard. All rights reserved.
This email was sent to you because you registered on our platform.
  `;
};

// Modified registration function with better error handling
exports.register = async (req, res) => {
  try {
    // Your existing registration logic
    const { name, email, password } = req.body;
    
    // Create user in database
    const user = await User.create({
      name,
      email,
      password
      // other user fields
    });
    
    // Optional: Generate verification token
    const verificationToken = user.generateVerificationToken(); // If you have this method
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    // Try to send welcome email but don't block registration if it fails
    try {
      await emailService.sendEmail(
        email,
        'Welcome to PointBoard!',
        emailTemplates.welcomeEmail(name, verificationUrl)
      );
      console.log(`Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue with registration process even if email fails
    }
    
    // Return response to client
    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};