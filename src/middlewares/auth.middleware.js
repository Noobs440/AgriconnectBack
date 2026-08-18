const { verifyAccessToken } = require('../services/token.service');
const prisma = require('../config/prisma');

const DEMO_TOKENS = new Set([]);

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token d\'authentification requis' });

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Format de token invalide' });
    }

    try {
      const decoded = verifyAccessToken(token);
      if (!decoded.role && decoded.id) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true },
          });
          if (user) {
            decoded.role = user.role;
            decoded.email = decoded.email || user.email;
          }
        } catch (lookupError) {
          console.error('Impossible de charger le rôle utilisateur:', lookupError.message);
        }
      }
      req.user = decoded;
      return next();
    } catch (verifyError) {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Utilisateur non authentifié' });

      const userRoles = [];
      if (req.user.activeRole) userRoles.push(req.user.activeRole);
      if (Array.isArray(req.user.roles)) userRoles.push(...req.user.roles);
      if (req.user.role) userRoles.push(req.user.role);

      const normalizedRoles = userRoles.map(role => String(role).toUpperCase());
      const allowed = allowedRoles.some(role => normalizedRoles.includes(String(role).toUpperCase()));
      if (!allowed) return res.status(403).json({ error: 'Accès refusé' });

    next();
  };
}

module.exports = { authenticate, authorize };