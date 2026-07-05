const redis = require('../config/redis');

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 chiffres
}

async function storeOtp(email, otp) {
  await redis.set(`otp:${email}`, otp, 'EX', 600); // expire dans 600s = 10min
}

async function verifyOtp(email, otp) {
  const stored = await redis.get(`otp:${email}`);
  if (!stored) return false;
  if (stored !== otp) return false;
  await redis.del(`otp:${email}`); // usage unique
  return true;
}

module.exports = { generateOtp, storeOtp, verifyOtp };