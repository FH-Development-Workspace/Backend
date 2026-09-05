const { query } = require('../config/database');

const loadUserPermissions = async (userId) => {
  const rolesRes = await query(`
    SELECT r.slug as role_slug, p.slug as perm_slug
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = $1
  `, [userId]);

  const permissions = new Set();
  const roles = new Set();

  for (const row of rolesRes.rows) {
    if (row.role_slug) roles.add(row.role_slug);
    if (row.perm_slug) permissions.add(row.perm_slug);
  }

  return { permissions: [...permissions], roles: [...roles] };
};

const hasPermission = (userPermissions = [], required) => {
  if (!required) return true;
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.some((p) => userPermissions.includes(p));
};

const hasRole = (userRoles = [], required) => {
  if (!required) return true;
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.some((r) => userRoles.includes(r));
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password_hash, passwordHash, ...safe } = user;
  return safe;
};

module.exports = {
  loadUserPermissions,
  hasPermission,
  hasRole,
  sanitizeUser,
};
