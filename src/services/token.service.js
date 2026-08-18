const jwt = require('jsonwebtoken');
const redis = require('../config/redis');

function parseDurationToSeconds(dur) {
  if (!dur) return 0;
  if (typeof dur === 'number') return dur;
  const match = String(dur).match(/^(\d+)([smhd])$/);
  if (!match) return parseInt(dur, 10) || 0;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return val;
    case 'm': return val * 60;
    case 'h': return val * 3600;
    case 'd': return val * 86400;
    default: return val;
  }
}

function generateAccessToken(user) {
  const payload = { id: user.id, email: user.email, role: user.role };
  if (user.activeRole) payload.activeRole = user.activeRole;
  if (user.roles) payload.roles = user.roles;
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
}

async function generateRefreshToken(user) {
  const token = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });
  const secs = parseDurationToSeconds(process.env.JWT_REFRESH_EXPIRES_IN) || 30 * 24 * 3600;
  await redis.set(`refresh:${token}`, user.id, 'EX', secs);
  return token;
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

async function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  const stored = await redis.get(`refresh:${token}`);
  if (!stored || stored !== decoded.id) throw new Error('Refresh token invalide ou révoqué');
  return decoded;
}

async function revokeRefreshToken(token) {
  await redis.del(`refresh:${token}`);
}

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, revokeRefreshToken };