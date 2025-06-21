/**
 * Generates HTML content for welcome email
 * @param {string} name - User's name
 * @returns {string} - HTML email content
 */
exports.welcomeEmail = (name) => {
  console.log('welcomeEmail called with name:', name);
  
  // Better name handling
  let firstName = 'there'; // Default fallback
  
  if (name && typeof name === 'string' && name.trim() !== '') {
    firstName = name.trim().split(' ')[0];
  }
  
  console.log('Using firstName in email:', firstName);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
    .header { background-color: #3498db; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; }
    .footer { font-size: 12px; color: #777; text-align: center; margin-top: 30px; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to PointBoard!</h1>
    </div>
    <div class="content">
      <h2>Hello ${firstName}!</h2>
      <p>Thank you for registering with PointBoard. We're excited to have you with us!</p>
      <p>Your account has been created successfully and you can now start using our services.</p>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Best regards,<br>The PointBoard Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} PointBoard. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Generates plain text version of welcome email (for clients that don't support HTML)
 * @param {string} name - User's name
 * @returns {string} - Plain text email content
 */
exports.welcomeEmailText = (name) => {
  return `
Welcome to PointBoard!

Hello ${name}!

Thank you for registering with PointBoard. We're excited to have you with us!

Your account has been created successfully and you can now start using our services.

If you have any questions, feel free to contact our support team.

Best regards,
The PointBoard Team

© ${new Date().getFullYear()} PointBoard. All rights reserved.
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

/**
 * Generates HTML content for password reset email
 * @param {string} name - User's name
 * @param {string} resetUrl - Password reset URL
 * @returns {string} - HTML email content
 */
exports.passwordResetEmail = (name, resetUrl) => {
  // Extract first name or use full name
  const firstName = name ? name.split(' ')[0] : 'there';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
    .header { background-color: #3498db; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; }
    .button { display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    .note { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 20px; font-size: 0.9em; }
    .footer { font-size: 12px; color: #777; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <h2>Hello ${firstName}!</h2>
      <p>We received a request to reset your password for your PointBoard account.</p>
      <p>Click the button below to reset your password:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>
      <div class="note">
        <p>This link is valid for 1 hour. If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} PointBoard. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

// Add this method to your existing emailTemplates
exports.passwordResetCodeEmail = (firstName, resetCode) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
    .header { background-color: #491E6C; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; }
    .code { 
      background-color: #f8f9fa; 
      border: 2px dashed #491E6C; 
      padding: 20px; 
      text-align: center; 
      font-size: 24px; 
      font-weight: bold;
      letter-spacing: 3px;
      margin: 20px 0;
    }
    .footer { font-size: 12px; color: #777; text-align: center; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Code</h1>
    </div>
    <div class="content">
      <h2>Hello ${firstName}!</h2>
      <p>You requested to reset your password for your PointBoard account.</p>
      <p>Use the following code to reset your password:</p>
      
      <div class="code">${resetCode}</div>
      
      <p><strong>Important:</strong></p>
      <ul>
        <li>This code will expire in 15 minutes</li>
        <li>Don't share this code with anyone</li>
        <li>If you didn't request this, please ignore this email</li>
      </ul>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} PointBoard. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

exports.passwordResetSuccessEmail = (firstName) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
    .header { background-color: #28a745; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; }
    .footer { font-size: 12px; color: #777; text-align: center; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Successful</h1>
    </div>
    <div class="content">
      <h2>Hello ${firstName}!</h2>
      <p>Your password has been successfully reset for your PointBoard account.</p>
      <p>You can now log in with your new password.</p>
      <p>If you didn't make this change, please contact our support team immediately.</p>
      <p>Best regards,<br>The PointBoard Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} PointBoard. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};