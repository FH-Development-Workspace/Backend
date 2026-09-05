const { verifyAccessToken } = require('../utils/tokens');
const { loadUserPermissions, sanitizeUser } = require('../utils/permissions');
const { query } = require('../config/database');
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

    const userRes = await query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (!userRes.rows.length) {
      return sendError(res, 'Account not available', 401, 'ACCOUNT_UNAVAILABLE');
    }

    const user = userRes.rows[0];
    if (user.status === 'DELETED' || user.status === 'BANNED') {
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
