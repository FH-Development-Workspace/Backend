const { sendError } = require('../utils/response');
const { hasRole } = require('../utils/permissions');

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }
    const required = roles.flat();
    if (!hasRole(req.userRoles, required)) {
      return sendError(res, 'Insufficient role', 403, 'FORBIDDEN');
    }
    next();
  };
};

module.exports = { requireRole };
