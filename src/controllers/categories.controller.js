const { query } = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const resCat = await query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
    sendSuccess(res, { categories: resCat.rows });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, description, icon, sortOrder } = req.body;
    const slug = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'cat-' + Date.now();

    const resCat = await query(`
      INSERT INTO categories (name, slug, description, icon, sort_order)
      VALUES ($1, $2, $3, $4, COALESCE($5, 0))
      RETURNING *
    `, [name, slug, description || null, icon || null, sortOrder]);

    sendSuccess(res, { category: resCat.rows[0] }, 'Category created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { name, description, icon, sortOrder } = req.body;
    const resCat = await query(`
      UPDATE categories
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          icon = COALESCE($3, icon),
          sort_order = COALESCE($4, sort_order),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [name, description, icon, sortOrder, req.params.id]);

    if (!resCat.rows.length) throw new AppError('Category not found', 404, 'NOT_FOUND');
    sendSuccess(res, { category: resCat.rows[0] }, 'Category updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    sendSuccess(res, null, 'Category deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove };
