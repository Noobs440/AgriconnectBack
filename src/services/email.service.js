const nodemailer = require('nodemailer');

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
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Votre code de vérification AgriConnect',
    html: `<p>Votre code OTP est : <strong>${otp}</strong></p><p>Il expire dans 10 minutes.</p>`,
  });
}

module.exports = { sendOtpEmail };