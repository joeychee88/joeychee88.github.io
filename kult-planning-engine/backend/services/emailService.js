import nodemailer from 'nodemailer';
import { createTransport } from 'nodemailer';

// Email configuration
// For development, we'll use Ethereal Email (free test SMTP)
// For production, use SendGrid, AWS SES, or your SMTP server

const isDevelopment = process.env.NODE_ENV !== 'production';

// Create reusable transporter
let transporter;

async function createTransporter() {
  if (isDevelopment) {
    // Use Ethereal for development (test emails)
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    console.log('📧 Email service: Using Ethereal (development mode)');
    console.log(`📧 Test account: ${testAccount.user}`);
  } else {
    // Production SMTP configuration
    // Set these environment variables in production:
    // EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS
    transporter = createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    console.log('📧 Email service: Using production SMTP');
  }
  
  return transporter;
}

// Initialize transporter
await createTransporter();

// Email templates
const templates = {
  magicLinkSignup: (name, magicLink) => ({
    subject: 'Welcome to KULT Planning Engine',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .content { background: #f8f9fa; padding: 30px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #764ba2; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { color: #856404; background-color: #fff3cd; border: 1px solid #ffeeba; padding: 10px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Welcome to KULT</h1>
          </div>
          <div class="content">
            <p>Hi${name ? ' ' + name : ''},</p>
            <p>Welcome to <strong>KULT Planning Engine</strong>! Click the button below to complete your registration and access your account:</p>
            <center>
              <a href="${magicLink}" class="button">Complete Registration</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: white; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">${magicLink}</p>
            <div class="warning">
              ⏱️ This link expires in <strong>15 minutes</strong> for security purposes.
            </div>
            <p>If you didn't sign up for KULT Planning Engine, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>KULT Planning Engine | Powered by KULT Malaysia</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Welcome to KULT Planning Engine!\n\nHi${name ? ' ' + name : ''},\n\nClick the link below to complete your registration:\n${magicLink}\n\nThis link expires in 15 minutes.\n\nIf you didn't sign up, please ignore this email.`
  }),
  
  magicLinkLogin: (name, magicLink) => ({
    subject: 'Your KULT Planning Engine Login Link',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .content { background: #f8f9fa; padding: 30px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #764ba2; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { color: #856404; background-color: #fff3cd; border: 1px solid #ffeeba; padding: 10px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Login to KULT</h1>
          </div>
          <div class="content">
            <p>Hi${name ? ' ' + name : ''},</p>
            <p>Click the button below to log in to your KULT Planning Engine account:</p>
            <center>
              <a href="${magicLink}" class="button">Log In to KULT</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: white; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">${magicLink}</p>
            <div class="warning">
              ⏱️ This link expires in <strong>15 minutes</strong> for security purposes.
            </div>
            <p>If you didn't request this login link, please ignore this email or contact support if you're concerned about your account security.</p>
          </div>
          <div class="footer">
            <p>KULT Planning Engine | Powered by KULT Malaysia</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your KULT Planning Engine Login Link\n\nHi${name ? ' ' + name : ''},\n\nClick the link below to log in:\n${magicLink}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, please ignore this email.`
  }),
  
  campaignBooked: (salesPersonName, clientName, companyName, campaignName, campaignDetails, campaignUrl) => ({
    subject: `New Campaign Booking: ${campaignName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .content { background: #f8f9fa; padding: 30px; }
          .detail-table { width: 100%; background: white; border-radius: 5px; margin: 20px 0; }
          .detail-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .detail-table td:first-child { font-weight: bold; color: #6b7280; width: 35%; }
          .button { display: inline-block; padding: 15px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #059669; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .highlight { background-color: #d1fae5; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📣 New Campaign Booking</h1>
          </div>
          <div class="content">
            <p>Hi ${salesPersonName},</p>
            <p>Great news! A new campaign has been booked and assigned to you:</p>
            
            <div class="highlight">
              <h2 style="margin-top: 0;">${campaignName}</h2>
              <p style="margin-bottom: 0;"><strong>${companyName}</strong></p>
            </div>
            
            <table class="detail-table">
              <tr><td>Client Contact:</td><td>${clientName}</td></tr>
              <tr><td>Email:</td><td>${campaignDetails.email}</td></tr>
              <tr><td>Phone:</td><td>${campaignDetails.phone || 'N/A'}</td></tr>
              <tr><td>Budget:</td><td>RM ${parseInt(campaignDetails.budget || 0).toLocaleString()}</td></tr>
              <tr><td>Objective:</td><td>${campaignDetails.objective}</td></tr>
              <tr><td>Industry:</td><td>${campaignDetails.industry}</td></tr>
              <tr><td>Timeline:</td><td>${campaignDetails.startDate || 'TBD'} - ${campaignDetails.endDate || 'TBD'}</td></tr>
              <tr><td>Formats:</td><td>${campaignDetails.formats || 'Multiple'}</td></tr>
            </table>
            
            <center>
              <a href="${campaignUrl}" class="button">View Full Campaign Details</a>
            </center>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Review the complete campaign details</li>
              <li>Contact the client to discuss requirements</li>
              <li>Prepare a detailed proposal or media plan</li>
            </ul>
          </div>
          <div class="footer">
            <p>KULT Planning Engine | Powered by KULT Malaysia</p>
            <p>This is an automated notification. For questions, contact your team lead.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `New Campaign Booking: ${campaignName}\n\nHi ${salesPersonName},\n\nA new campaign has been booked:\n\nCampaign: ${campaignName}\nClient: ${companyName}\nContact: ${clientName}\nEmail: ${campaignDetails.email}\nBudget: RM ${parseInt(campaignDetails.budget || 0).toLocaleString()}\nObjective: ${campaignDetails.objective}\n\nView full details: ${campaignUrl}`
  }),
  
  welcomeUser: (name, email, temporaryPassword, loginUrl) => ({
    subject: 'Welcome to KULT Planning Engine - Your Account is Ready!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .content { background: #f8f9fa; padding: 30px; }
          .credentials-box { background: white; border: 2px solid #667eea; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .credentials-box h3 { margin-top: 0; color: #667eea; }
          .credential-item { display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; margin: 10px 0; border-radius: 5px; }
          .credential-label { font-weight: bold; color: #6b7280; }
          .credential-value { font-family: monospace; color: #1f2937; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #764ba2; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { color: #856404; background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .tip { color: #004085; background-color: #cce5ff; border: 1px solid #b8daff; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to KULT!</h1>
          </div>
          <div class="content">
            <p>Hi${name ? ' ' + name : ''},</p>
            <p>Your account has been created successfully! You can now access the <strong>KULT Planning Engine</strong> to start planning and managing your campaigns.</p>
            
            <div class="credentials-box">
              <h3>🔐 Your Login Credentials</h3>
              <div class="credential-item">
                <span class="credential-label">Email:</span>
                <span class="credential-value">${email}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Temporary Password:</span>
                <span class="credential-value">${temporaryPassword}</span>
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong><br>
              Please change your password after your first login for security purposes.
            </div>
            
            <center>
              <a href="${loginUrl}" class="button">Log In to KULT</a>
            </center>
            
            <div class="tip">
              <strong>💡 Getting Started:</strong><br>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Log in with your credentials above</li>
                <li>Explore the dashboard and available features</li>
                <li>Update your profile and password</li>
                <li>Start creating campaigns</li>
              </ul>
            </div>
            
            <p>If you have any questions or need assistance, please contact your administrator.</p>
          </div>
          <div class="footer">
            <p>KULT Planning Engine | Powered by KULT Malaysia</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Welcome to KULT Planning Engine!\n\nHi${name ? ' ' + name : ''},\n\nYour account has been created!\n\nLogin Credentials:\nEmail: ${email}\nTemporary Password: ${temporaryPassword}\n\n⚠️ Please change your password after your first login.\n\nLog in here: ${loginUrl}\n\nIf you need help, contact your administrator.`
  }),
  
  campaignPendingApproval: (clientAdminName, teamMemberName, campaignName, campaignDetails, reviewUrl) => ({
    subject: `Campaign Pending Approval: ${campaignName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .content { background: #f8f9fa; padding: 30px; }
          .detail-table { width: 100%; background: white; border-radius: 5px; margin: 20px 0; }
          .detail-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .detail-table td:first-child { font-weight: bold; color: #6b7280; width: 35%; }
          .button { display: inline-block; padding: 15px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #d97706; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏳ Campaign Needs Your Approval</h1>
          </div>
          <div class="content">
            <p>Hi ${clientAdminName},</p>
            <p><strong>${teamMemberName}</strong> has submitted a campaign for your approval:</p>
            
            <table class="detail-table">
              <tr><td>Campaign Name:</td><td><strong>${campaignName}</strong></td></tr>
              <tr><td>Budget:</td><td>RM ${parseInt(campaignDetails.budget || 0).toLocaleString()}</td></tr>
              <tr><td>Objective:</td><td>${campaignDetails.objective}</td></tr>
              <tr><td>Submitted:</td><td>${new Date().toLocaleDateString()}</td></tr>
            </table>
            
            <center>
              <a href="${reviewUrl}" class="button">Review & Approve Campaign</a>
            </center>
            
            <p><strong>Actions Available:</strong></p>
            <ul>
              <li>✅ Approve and proceed to booking</li>
              <li>♻️ Reassign to another team member</li>
              <li>❌ Reject with feedback</li>
            </ul>
          </div>
          <div class="footer">
            <p>KULT Planning Engine | Powered by KULT Malaysia</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Campaign Pending Approval: ${campaignName}\n\nHi ${clientAdminName},\n\n${teamMemberName} has submitted a campaign for approval:\n\nCampaign: ${campaignName}\nBudget: RM ${parseInt(campaignDetails.budget || 0).toLocaleString()}\n\nReview here: ${reviewUrl}`
  })
};

// Send magic link email
export async function sendMagicLink(email, name, token, type = 'login') {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3006';
    const magicLink = `${baseUrl}/auth/verify?token=${token}`;
    
    const template = type === 'signup' 
      ? templates.magicLinkSignup(name, magicLink)
      : templates.magicLinkLogin(name, magicLink);
    
    const info = await transporter.sendMail({
      from: '"KULT Planning Engine" <noreply@kult.my>',
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
    
    console.log(`📧 Magic link email sent to ${email}`);
    
    if (isDevelopment) {
      console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: isDevelopment ? nodemailer.getTestMessageUrl(info) : null
    };
  } catch (error) {
    console.error('❌ Failed to send magic link email:', error);
    throw error;
  }
}

// Send campaign booking notification
export async function sendCampaignBookingEmail(salesPersonEmail, salesPersonName, clientName, companyName, campaignName, campaignDetails, campaignUrl) {
  try {
    const template = templates.campaignBooked(salesPersonName, clientName, companyName, campaignName, campaignDetails, campaignUrl);
    
    const info = await transporter.sendMail({
      from: '"KULT Planning Engine" <noreply@kult.my>',
      to: salesPersonEmail,
      cc: campaignDetails.email, // CC the client
      subject: template.subject,
      text: template.text,
      html: template.html
    });
    
    console.log(`📧 Booking notification sent to ${salesPersonEmail}`);
    
    if (isDevelopment) {
      console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: isDevelopment ? nodemailer.getTestMessageUrl(info) : null
    };
  } catch (error) {
    console.error('❌ Failed to send booking email:', error);
    throw error;
  }
}

// Send campaign pending approval notification
export async function sendCampaignPendingApprovalEmail(clientAdminEmail, clientAdminName, teamMemberName, campaignName, campaignDetails, reviewUrl) {
  try {
    const template = templates.campaignPendingApproval(clientAdminName, teamMemberName, campaignName, campaignDetails, reviewUrl);
    
    const info = await transporter.sendMail({
      from: '"KULT Planning Engine" <noreply@kult.my>',
      to: clientAdminEmail,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
    
    console.log(`📧 Approval request sent to ${clientAdminEmail}`);
    
    if (isDevelopment) {
      console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: isDevelopment ? nodemailer.getTestMessageUrl(info) : null
    };
  } catch (error) {
    console.error('❌ Failed to send approval email:', error);
    throw error;
  }
}

// Send welcome email to new user
export async function sendWelcomeEmail(email, name, temporaryPassword) {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3006';
    const loginUrl = `${baseUrl}/login`;
    
    const template = templates.welcomeUser(name, email, temporaryPassword, loginUrl);
    
    const info = await transporter.sendMail({
      from: '"KULT Planning Engine" <noreply@kult.my>',
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
    
    console.log(`📧 Welcome email sent to ${email}`);
    
    if (isDevelopment) {
      console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: isDevelopment ? nodemailer.getTestMessageUrl(info) : null
    };
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    throw error;
  }
}

export default {
  sendMagicLink,
  sendWelcomeEmail,
  sendCampaignBookingEmail,
  sendCampaignPendingApprovalEmail
};
