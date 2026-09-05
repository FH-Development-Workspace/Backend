const { query } = require('../config/database');
const { sendSuccess } = require('../utils/response');

const list = async (req, res, next) => {
  try {
    const resPerms = await query('SELECT * FROM permissions ORDER BY resource ASC, action ASC');
    sendSuccess(res, { permissions: resPerms.rows });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { resource, action, description } = req.body;
    const slug = `${resource.toUpperCase()}_${action.toUpperCase()}`;
    const name = slug.replace(/_/g, ' ');

    const resPerm = await query(`
      INSERT INTO permissions (name, slug, resource, action, description)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (slug) DO UPDATE
      SET description = EXCLUDED.description
      RETURNING *
    `, [name, slug, resource.toUpperCase(), action.toUpperCase(), description || null]);

    sendSuccess(res, { permission: resPerm.rows[0] }, 'Permission created', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create };
