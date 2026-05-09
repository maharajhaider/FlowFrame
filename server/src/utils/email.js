const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, 
  },
});

// Send invitation email
const sendInvitationEmail = async (email, inviteToken, invitedBy, role) => {
  // Ensure CLIENT_URL doesn't end with a slash to avoid double slashes
  const baseUrl = process.env.CLIENT_URL?.endsWith('/') 
    ? process.env.CLIENT_URL.slice(0, -1) 
    : process.env.CLIENT_URL;
  const inviteUrl = `${baseUrl}/signup?token=${inviteToken}&email=${encodeURIComponent(email)}`;
  
  const roleLabels = {
    user: 'User',
    project_manager: 'Project Manager',
    developer: 'Developer',
    designer: 'Designer',
    tester: 'Tester'
  };
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'You\'ve been invited to join FlowFrame',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">FlowFrame</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Project Management Platform</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333; margin-bottom: 20px;">You've been invited!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            <strong>${invitedBy}</strong> has invited you to join FlowFrame as a <strong>${roleLabels[role]}</strong>.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            You'll have access to project management features based on your assigned role.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            Click the button below to create your account and start collaborating on projects.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block; 
                      font-weight: bold;
                      font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              <strong>Your Role:</strong> ${roleLabels[role]}
            </p>
          </div>
          
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            This invitation link will expire in 7 days. If you have any questions, please contact your team administrator.
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666;">
          <p style="margin: 0; font-size: 14px;">
            © 2024 FlowFrame. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
    return false;
  }
};

// Send email verification email
const sendEmailVerification = async (email, verificationToken) => {
  // Ensure CLIENT_URL doesn't end with a slash to avoid double slashes
  const baseUrl = process.env.CLIENT_URL?.endsWith('/') 
    ? process.env.CLIENT_URL.slice(0, -1) 
    : process.env.CLIENT_URL;
  const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your FlowFrame email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">FlowFrame</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Email Verification</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333; margin-bottom: 20px;">Verify your email address</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Thanks for signing up for FlowFrame! To complete your registration, please verify your email address.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block; 
                      font-weight: bold;
                      font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            This verification link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666;">
          <p style="margin: 0; font-size: 14px;">
            © 2024 FlowFrame. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  // Ensure CLIENT_URL doesn't end with a slash to avoid double slashes
  const baseUrl = process.env.CLIENT_URL?.endsWith('/') 
    ? process.env.CLIENT_URL.slice(0, -1) 
    : process.env.CLIENT_URL;
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reset your FlowFrame password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">FlowFrame</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333; margin-bottom: 20px;">Reset your password</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We received a request to reset your password for your FlowFrame account. Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block; 
                      font-weight: bold;
                      font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666;">
          <p style="margin: 0; font-size: 14px;">
            © 2024 FlowFrame. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

module.exports = {
  sendInvitationEmail,
  sendEmailVerification,
  sendPasswordResetEmail,
};