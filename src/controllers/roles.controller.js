const { query } = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const resRoles = await query('SELECT * FROM roles ORDER BY name ASC');
    sendSuccess(res, { roles: resRoles.rows });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, description, department } = req.body;
    const slug = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

    const resRole = await query(`
      INSERT INTO roles (name, slug, description, department, is_system)
      VALUES ($1, $2, $3, $4, false)
      RETURNING *
    `, [name, slug, description || null, department || null]);

    sendSuccess(res, { role: resRole.rows[0] }, 'Role created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { name, description, department } = req.body;
    const resRole = await query(`
      UPDATE roles
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          department = COALESCE($3, department),
          updated_at = NOW()
      WHERE id = $4 AND is_system = false
      RETURNING *
    `, [name, description, department, req.params.id]);

    if (!resRole.rows.length) throw new AppError('Role not found or is a protected system role', 400, 'BAD_REQUEST');
    sendSuccess(res, { role: resRole.rows[0] }, 'Role updated');
  } catch (err) {
    next(err);
  }
};

const assignPermissions = async (req, res, next) => {
  try {
    const { permissionIds } = req.body;
    const roleId = req.params.id;

    await query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
    if (permissionIds?.length) {
      for (const pId of permissionIds) {
        await query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [roleId, pId]);
      }
    }

    sendSuccess(res, null, 'Permissions assigned');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM roles WHERE id = $1 AND is_system = false', [req.params.id]);
    sendSuccess(res, null, 'Role deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  listRoles: list,
  create,
  createRole: create,
  update,
  updateRole: update,
  assignPermissions,
  remove,
};
