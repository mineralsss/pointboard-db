/**
 * Generates HTML content for welcome email
 * @param {string} name - User's name
 * @returns {string} - HTML email content
 */
exports.welcomeEmail = (name) => {
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
      <h2>Hello ${name}!</h2>
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