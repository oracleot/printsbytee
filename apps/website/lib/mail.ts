import nodemailer from 'nodemailer';

/**
 * Get SMTP config from environment — validates at send time, not import time.
 * This allows Next.js to build without requiring SMTP_* vars to be set during build.
 */
function getSMTPConfig() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error(
      'Missing required SMTP environment variables: SMTP_HOST, SMTP_USER, SMTP_PASS must be set.'
    );
  }

  return {
    host: smtpHost,
    port: parseInt(smtpPort || '587', 10),
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  };
}

/** Lazily-created transporter — created only when sendMail is called. */
// Removed: getTransporter was redundant with getSMTPConfig + createTransport

/**
 * Escape a string for safe insertion into HTML email content.
 * Prevents HTML injection via name, email, message, etc.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface EnquiryEmailData {
  name: string;
  email: string;
  productInterest?: string;
  message: string;
}

export async function sendEnquiryEmail(data: EnquiryEmailData): Promise<void> {
  const config = getSMTPConfig();
  const transporter = nodemailer.createTransport(config);
  const toEmail = process.env.ENQUIRY_EMAIL || 'hello@printsbytee.co.uk';
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeProductInterest = data.productInterest ? escapeHtml(data.productInterest) : '';
  const safeMessage = escapeHtml(data.message);

  const mailOptions = {
    from: config.auth.user,
    to: toEmail,
    subject: `New Enquiry from ${safeName}${safeProductInterest ? ` - ${safeProductInterest}` : ''}`,
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0D0D0D, #1B4D3E); padding: 30px; text-align: center;">
          <h1 style="color: #C9A84C; margin: 0; font-size: 28px;">New Enquiry — PrintsbyTee</h1>
        </div>
        <div style="padding: 30px; background: #F5F0E8;">
          <div style="margin-bottom: 20px; padding: 15px; background: white; border-left: 4px solid #C9A84C;">
            <p style="margin: 5px 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Name</p>
            <p style="margin: 0; font-size: 18px; color: #0D0D0D;">${safeName}</p>
          </div>
          <div style="margin-bottom: 20px; padding: 15px; background: white; border-left: 4px solid #1B4D3E;">
            <p style="margin: 5px 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email</p>
            <p style="margin: 0; font-size: 18px; color: #0D0D0D;"><a href="mailto:${safeEmail}">${safeEmail}</a></p>
          </div>
          ${safeProductInterest ? `
          <div style="margin-bottom: 20px; padding: 15px; background: white; border-left: 4px solid #C75B39;">
            <p style="margin: 5px 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Product Interest</p>
            <p style="margin: 0; font-size: 18px; color: #0D0D0D;">${safeProductInterest}</p>
          </div>
          ` : ''}
          <div style="padding: 15px; background: white; border-left: 4px solid #C9A84C;">
            <p style="margin: 5px 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Message</p>
            <p style="margin: 0; font-size: 16px; color: #0D0D0D; line-height: 1.6;">${safeMessage.replace(/\n/g, '<br>')}</p>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; background: #0D0D0D; color: #C9A84C; font-size: 12px;">
          Sent via printsbytee.co.uk
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}