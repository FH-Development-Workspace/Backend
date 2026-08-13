const { sendError } = require('../utils/response');
const { hasPermission, hasRole } = require('../utils/permissions');

const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }
    const required = permissions.flat();
    if (!hasPermission(req.userPermissions, required)) {
      return sendError(res, 'Insufficient permissions', 403, 'FORBIDDEN');
    }
    next();
  };
};

module.exports = { requirePermission };
