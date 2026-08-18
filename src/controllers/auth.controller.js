const prisma = require('../config/prisma');
const { generateOtp, storeOtp, verifyOtp } = require('../services/otp.service');
const { sendOtpEmail, sendOtpToContact } = require('../services/email.service');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, revokeRefreshToken } = require('../services/token.service');

const VALID_ROLES = new Set(['FARMER', 'BUYER_PRO', 'BUYER_PARTICULIER', 'ADMIN']);

function parseIdentifier(req) {
  let identifier = req.body.identifier || req.body.email || req.body.phone;
  let type = req.body.type;
  if (!type) {
    if (req.body.email) type = 'email';
    else if (req.body.phone) type = 'contact';
  }
  return { identifier, type };
}

function getUserWhere(type, identifier) {
  return type === 'contact' ? { contact: identifier } : { email: identifier };
}

function formatUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    contact: user.contact,
    role: user.role,
    isVerified: user.isVerified,
  };
}

async function createAuthTokens(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);
  return { accessToken, refreshToken };
}

async function requestOtp(req, res) {
  try {
    const { identifier, type } = parseIdentifier(req);
    if (!identifier || !type) return res.status(400).json({ error: 'identifier et type requis' });

    const otp = generateOtp();
    await storeOtp(type, identifier, otp);

    if (type === 'email') await sendOtpEmail(identifier, otp);
    else await sendOtpToContact(identifier, otp);

    res.json({ message: 'OTP envoyé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function register(req, res) {
  try {
    const { identifier, type } = parseIdentifier(req);
    const password = req.body.password;
    const fullName = req.body.fullName;
    const role = req.body.role || 'BUYER_PARTICULIER';

    if (!identifier || !type) return res.status(400).json({ error: 'identifier et type requis' });
    if (!password) return res.status(400).json({ error: 'Mot de passe requis pour l inscription' });
    if (!VALID_ROLES.has(role)) return res.status(400).json({ error: 'role invalide' });

    const where = getUserWhere(type, identifier);
    const existingUser = await prisma.user.findUnique({ where });
    if (existingUser) {
      return res.status(409).json({ error: 'Utilisateur déjà enregistré. Veuillez vous connecter.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: type === 'email' ? identifier : null,
        contact: type === 'contact' ? identifier : null,
        password: hashedPassword,
        fullName: fullName || null,
        isVerified: true,
        role,
      },
    });

    const tokens = await createAuthTokens(user);
    res.status(201).json({
      ...tokens,
      user: formatUserResponse(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function verifyOtpAndRegister(req, res) {
  try {
    const { identifier, type } = parseIdentifier(req);
    const otp = req.body.otp || req.body.code;
    const password = req.body.password;
    const fullName = req.body.fullName;
    const role = req.body.role || 'BUYER_PARTICULIER';

    if (!identifier || !type) return res.status(400).json({ error: 'identifier requis' });
    if (!otp) return res.status(400).json({ error: 'OTP requis' });
    if (!VALID_ROLES.has(role)) return res.status(400).json({ error: 'role invalide' });

    const isValid = await verifyOtp(type, identifier, otp);
    if (!isValid) return res.status(400).json({ error: 'OTP invalide ou expiré' });

    const where = getUserWhere(type, identifier);
    let user = await prisma.user.findUnique({ where });
    if (user) {
      const tokens = await createAuthTokens(user);
      return res.json({
        ...tokens,
        user: formatUserResponse(user),
        message: 'Utilisateur existant connecté via OTP.',
      });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : await bcrypt.hash(Math.random().toString(36), 10);
    user = await prisma.user.create({
      data: {
        email: type === 'email' ? identifier : null,
        contact: type === 'contact' ? identifier : null,
        password: hashedPassword,
        fullName: fullName || null,
        isVerified: true,
        role,
      },
    });

    const tokens = await createAuthTokens(user);
    res.status(201).json({
      ...tokens,
      user: formatUserResponse(user),
      message: 'Utilisateur créé et authentifié via OTP.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function login(req, res) {
  try {
    const { identifier, type } = parseIdentifier(req);
    const otp = req.body.otp || req.body.code;

    if (!identifier || !type) return res.status(400).json({ error: 'identifier requis' });
    if (!otp) return res.status(400).json({ error: 'OTP requis pour la connexion' });

    const where = getUserWhere(type, identifier);
    const user = await prisma.user.findUnique({ where });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable. Veuillez utiliser /verify-otp pour vous inscrire.' });
    }

    const isValid = await verifyOtp(type, identifier, otp);
    if (!isValid) return res.status(400).json({ error: 'OTP invalide ou expiré' });

    const tokens = await createAuthTokens(user);
    res.json({
      ...tokens,
      user: formatUserResponse(user),
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
      decoded = await verifyRefreshToken(token);
    } catch (err) {
      return res.status(401).json({ error: 'Refresh token invalide ou expiré' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const tokens = await createAuthTokens(user);
    res.json(tokens);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function logout(req, res) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ error: 'Refresh token requis' });
    await revokeRefreshToken(token);
    res.json({ message: 'Déconnecté' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function addRole(req, res) {
  try {
    const { userId, role } = req.body;
    if (!userId || !role) return res.status(400).json({ error: 'userId et role requis' });
    return res.status(501).json({ error: 'Les rôles multiples ne sont pas configurés dans le schéma actuel' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function switchRole(req, res) {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'role requis' });
    if (!VALID_ROLES.has(role)) return res.status(400).json({ error: 'role invalide' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Rôle non enregistré pour cet utilisateur' });
    res.json({ role });
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
        profileImage: true,
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

async function listSellers(req, res) {
  try {
    const query = String(req.query.search || '').trim();
    const sellers = await prisma.user.findMany({
      where: {
        role: 'FARMER',
        ...(query ? {
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
      take: 20,
    });

    return res.json({ sellers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Impossible de rechercher les vendeurs' });
  }
}

async function listUsers(req, res) {
  try {
    const query = String(req.query.search || '').trim();
    const users = await prisma.user.findMany({
      where: query ? {
        OR: [
          { fullName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      } : {},
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: { fullName: 'asc' },
      take: 30,
    });

    return res.json({ users });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Impossible de rechercher les utilisateurs' });
  }
}

async function updateProfile(req, res) {
  try {
    const { fullName, profileImage } = req.body;
    if (fullName === undefined) return res.status(400).json({ error: 'fullName requis' });
    if (profileImage !== undefined && profileImage !== null && (typeof profileImage !== 'string' || !profileImage.startsWith('data:image/'))) {
      return res.status(400).json({ error: 'Photo de profil invalide' });
    }
    if (typeof profileImage === 'string' && profileImage.length > 8 * 1024 * 1024) {
      return res.status(413).json({ error: 'Photo de profil trop volumineuse' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { fullName, ...(profileImage !== undefined ? { profileImage } : {}) },
      select: {
        id: true,
        email: true,
        fullName: true,
        profileImage: true,
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

module.exports = { requestOtp, register, verifyOtpAndRegister, login, refreshToken, getProfile, listSellers, listUsers, updateProfile, logout, addRole, switchRole };