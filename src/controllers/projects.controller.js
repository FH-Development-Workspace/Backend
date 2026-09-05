const { query } = require('../config/database');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const countRes = await query("SELECT COUNT(*) FROM products WHERE status = 'ACTIVE'");
    const total = parseInt(countRes.rows[0].count, 10);

    const itemsRes = await query(`
      SELECT id, name, slug, summary as description, status, created_at
      FROM products
      WHERE status = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, skip]);

    sendPaginated(res, itemsRes.rows, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getBySlug = async (req, res, next) => {
  try {
    const resProj = await query("SELECT id, name, slug, summary as description, status, created_at FROM products WHERE slug = $1 AND status = 'ACTIVE'", [req.params.slug]);
    if (!resProj.rows.length) throw new AppError('Project not found', 404, 'NOT_FOUND');
    sendSuccess(res, { project: resProj.rows[0] });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const slug = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project-' + Date.now();
    const resProj = await query(`
      INSERT INTO products (name, slug, summary, description, status)
      VALUES ($1, $2, $3, $3, 'ACTIVE')
      RETURNING *
    `, [name, slug, description || name]);
    sendSuccess(res, { project: resProj.rows[0] }, 'Project created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const resProj = await query(`
      UPDATE products
      SET name = COALESCE($1, name),
          summary = COALESCE($2, summary),
          description = COALESCE($2, description),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [name, description, req.params.id]);

    if (!resProj.rows.length) throw new AppError('Project not found', 404, 'NOT_FOUND');
    sendSuccess(res, { project: resProj.rows[0] }, 'Project updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query("UPDATE products SET status = 'DISCONTINUED' WHERE id = $1", [req.params.id]);
    sendSuccess(res, null, 'Project deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getBySlug, create, update, remove };
