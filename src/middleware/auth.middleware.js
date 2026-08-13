const { verifyAccessToken } = require('../utils/tokens');
const { loadUserPermissions, sanitizeUser } = require('../utils/permissions');
const prisma = require('../config/database');
const { sendError } = require('../utils/response');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return sendError(res, 'Invalid or expired token', 401, 'INVALID_TOKEN');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { profile: true },
    });

    if (!user || user.status === 'DELETED' || user.status === 'BANNED') {
      return sendError(res, 'Account not available', 401, 'ACCOUNT_UNAVAILABLE');
    }

    if (user.status === 'SUSPENDED') {
      return sendError(res, 'Account suspended', 403, 'ACCOUNT_SUSPENDED');
    }

    const { permissions, roles } = await loadUserPermissions(user.id);
    req.user = sanitizeUser(user);
    req.userPermissions = permissions;
    req.userRoles = roles;
    next();
  } catch (err) {
    next(err);
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }
  return authenticate(req, res, next);
};

module.exports = { authenticate, optionalAuth };
