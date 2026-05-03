import nodemailer from 'nodemailer';

// Use Ethereal Email for testing if no real SMTP is configured
let transporter: nodemailer.Transporter | null = null;

const createTransporter = async () => {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;

  if (user && pass && host && port) {
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: port === '465',
      auth: {
        user,
        pass,
      },
    });
  } else {
    // Generate a test account if no SMTP info is provided
    console.log('No SMTP config found, generating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
  }

  return transporter;
};

export const sendPasswordResetEmail = async (email: string, resetToken: string, origin: string) => {
  try {
    const t = await createTransporter();
    
    // Construct the reset URL
    const resetUrl = `${origin}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: '"Digital Literary Studio" <noreply@digitalliterarystudio.com>',
      to: email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6b3f2c;">Password Reset Request</h2>
          <p>You recently requested to reset your password for your Digital Literary Studio account.</p>
          <p>Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #6b3f2c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">If you're having trouble clicking the password reset button, copy and paste the URL below into your web browser:</p>
          <p style="color: #6b3f2c; font-size: 14px; word-break: break-all;">${resetUrl}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">If you did not request a password reset, please ignore this email or reply to let us know. This password reset is only valid for the next hour.</p>
        </div>
      `,
    };

    const info = await t.sendMail(mailOptions);
    console.log('Password reset email sent to:', email);
    
    // If using ethereal, log the URL to preview the email
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('Error sending password reset email:', error);
    // In production, we might want to throw the error to handle it properly,
    // but here we just log it so it doesn't break the flow completely if email fails.
  }
};

export default {
  sendPasswordResetEmail,
};
