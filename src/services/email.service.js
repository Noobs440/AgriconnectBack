const nodemailer = require('nodemailer');

const smtpConfig = {
  host: process.env.SMTP_HOST?.trim(),
  port: process.env.SMTP_PORT?.trim(),
  user: process.env.SMTP_USER?.trim(),
  // Gmail displays app passwords in groups; SMTP expects the characters without spaces.
  pass: process.env.SMTP_PASS?.replace(/\s+/g, ''),
  from: process.env.SMTP_FROM?.trim(),
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true pour le port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOtpEmail(to, otp) {
  const missing = ['host', 'port', 'user', 'pass', 'from'].filter(key => !smtpConfig[key]);
  if (missing.length > 0) {
    const error = new Error(`Configuration SMTP incomplete: ${missing.join(', ')}`);
    error.code = 'ESMTPCONFIG';
    throw error;
  }

  await transporter.sendMail({
    from: smtpConfig.from,
    to,
    subject: 'Votre code de vérification AgriConnect',
    html: `<p>Votre code OTP est : <strong>${otp}</strong></p><p>Il expire dans 10 minutes.</p>`,
  });
}

async function sendOtpToContact(contact, otp) {
  // Placeholder: integrate SMS provider here. For now, log the OTP so devs can use it.
  console.log(`OTP for ${contact}: ${otp}`);
  return true;
}

module.exports = { sendOtpEmail, sendOtpToContact };