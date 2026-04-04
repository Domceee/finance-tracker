import nodemailer from 'nodemailer';

const mailHost = process.env.MAIL_HOST;
const mailPort = process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : undefined;
const mailUser = process.env.MAIL_USER;
const mailPass = process.env.MAIL_PASS;
const mailFrom = process.env.MAIL_FROM;
const mailSecure = process.env.MAIL_SECURE === 'true';

function hasMailConfig() {
  return Boolean(mailHost && mailPort && mailUser && mailPass && mailFrom);
}

async function sendWithSmtp(to: string, subject: string, text: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: mailHost,
    port: mailPort,
    secure: mailSecure,
    auth: {
      user: mailUser,
      pass: mailPass,
    },
  });

  await transporter.sendMail({
    from: mailFrom,
    to,
    subject,
    text,
    html,
  });
}

export async function sendVerificationEmail(email: string, code: string) {
  const subject = 'Your verification code';
  const text = `Your verification code is ${code}. It expires in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Your verification code</h2>
      <p>Use this code to finish creating your account:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>This code expires in 10 minutes.</p>
    </div>
  `;

  if (!hasMailConfig()) {
    console.warn('MAIL_* variables are not configured. Falling back to console output for verification codes.');
    console.log(`Verification code for ${email}: ${code}`);
    return;
  }

  await sendWithSmtp(email, subject, text, html);
}
