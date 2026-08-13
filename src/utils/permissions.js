const prisma = require('../config/database');

const loadUserPermissions = async (userId) => {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const permissions = new Set();
  const roles = [];

  for (const ur of userRoles) {
    roles.push(ur.role.slug);
    for (const rp of ur.role.permissions) {
      permissions.add(rp.permission.slug);
    }
  }

  return { permissions: [...permissions], roles };
};

const hasPermission = (userPermissions, required) => {
  if (!required) return true;
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.some((p) => userPermissions.includes(p));
};

const hasRole = (userRoles, required) => {
  if (!required) return true;
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.some((r) => userRoles.includes(r));
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
};

module.exports = {
  loadUserPermissions,
  hasPermission,
  hasRole,
  sanitizeUser,
};
