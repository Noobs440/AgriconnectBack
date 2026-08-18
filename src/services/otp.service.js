const redis = require('../config/redis');

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 chiffres
}

function makeKey(type, identifier) {
  const t = type === 'contact' ? 'contact' : 'email';
  return `otp:${t}:${identifier}`;
}

async function storeOtp(type, identifier, otp) {
  const key = makeKey(type, identifier);
  await redis.set(key, otp, 'EX', 600); // expire dans 600s = 10min
}

async function verifyOtp(type, identifier, otp) {
  const key = makeKey(type, identifier);
  const stored = await redis.get(key);
  if (!stored) return false;
  if (stored !== otp) return false;
  await redis.del(key); // usage unique
  return true;
}

module.exports = { generateOtp, storeOtp, verifyOtp };