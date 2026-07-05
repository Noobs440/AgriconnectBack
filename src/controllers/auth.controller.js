const prisma = require('../config/prisma');
const { generateOtp, storeOtp, verifyOtp } = require('../services/otp.service');
const { sendOtpEmail } = require('../services/email.service');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../services/token.service');

async function requestOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const otp = generateOtp();
    await storeOtp(email, otp);
    await sendOtpEmail(email, otp);

    res.json({ message: 'OTP envoyé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function verifyOtpAndRegister(req, res) {
  try {
    const { email, otp, role } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email et OTP requis' });

    const isValid = await verifyOtp(email, otp);
    if (!isValid) return res.status(400).json({ error: 'OTP invalide ou expiré' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Utilisateur déjà enregistré. Veuillez utiliser /login.' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(Math.random().toString(36), 10),
        isVerified: true,
        role: role || 'BUYER_PARTICULIER',
      },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function login(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email et OTP requis' });

    const isValid = await verifyOtp(email, otp);
    if (!isValid) return res.status(400).json({ error: 'OTP invalide ou expiré' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable. Veuillez utiliser /verify-otp pour vous inscrire.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function refreshToken(req, res) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ error: 'Refresh token requis' });

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return res.status(401).json({ error: 'Refresh token invalide ou expiré' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function updateProfile(req, res) {
  try {
    const { fullName } = req.body;
    if (fullName === undefined) return res.status(400).json({ error: 'fullName requis' });

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { fullName },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { requestOtp, verifyOtpAndRegister, login, refreshToken, getProfile, updateProfile };