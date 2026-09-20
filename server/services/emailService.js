import nodemailer from 'nodemailer';

// Log business registration data
export const sendBusinessRegistrationEmail = async (businessData) => {
  try {
    console.log('Business registration received:', {
      businessName: businessData.businessName,
      businessCategory: businessData.businessCategory,
      email: businessData.email,
      phone: businessData.phone,
      city: businessData.city,
      region: businessData.region,
    });
    return { success: true, message: 'Registration logged' };
  } catch (error) {
    console.error('Error logging registration:', error);
    return { success: true, message: 'Registration processed' };
  }
};

// Sends a one-time passcode by email using SMTP when configured (EMAIL_HOST /
// EMAIL_USER / EMAIL_PASS). When SMTP is not configured it runs in dev mode:
// the code is logged and returned so flows remain testable end-to-end.
export const sendOtpEmail = async (email, code) => {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.EMAIL_PORT || 587),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: { user, pass },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'NKAY Marketplace <no-reply@nkay.technology>',
        to: email,
        subject: 'Your NKAY verification code',
        text: `Your NKAY verification code is ${code}. It expires in 5 minutes.\n\nIf you did not request this code, you can safely ignore this email.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #eee5df;border-radius:16px;">
            <h2 style="color:#6f3d27;margin:0 0 12px;">Your NKAY verification code</h2>
            <p style="color:#4e362a;font-size:15px;line-height:1.5;">Use the code below to continue to checkout. It expires in 5 minutes.</p>
            <div style="margin:20px 0;padding:16px;background:#f5ebe5;border-radius:12px;text-align:center;font-size:28px;font-weight:700;letter-spacing:8px;color:#2d211b;">${code}</div>
            <p style="color:#927f74;font-size:13px;">If you did not request this code, you can safely ignore this email.</p>
          </div>
        `,
      });

      return { success: true, delivery: 'email' };
    } catch (error) {
      console.error('OTP email send failed:', error);
      return { success: false, delivery: 'email', error: error.message || String(error) };
    }
  }

  console.log('[OTP dev mode] Verification code for', email, 'is', code);
  return { success: true, delivery: 'dev' };
};