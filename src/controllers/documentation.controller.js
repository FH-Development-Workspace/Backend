const { query } = require('../config/database');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const listCategories = async (req, res, next) => {
  try {
    const resCat = await query('SELECT * FROM documentation_categories ORDER BY sort_order ASC, name ASC');
    sendSuccess(res, { categories: resCat.rows });
  } catch (err) {
    next(err);
  }
};

const listArticles = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const countRes = await query('SELECT COUNT(*) FROM documentation_articles');
    const total = parseInt(countRes.rows[0].count, 10);

    const itemsRes = await query(`
      SELECT da.*, dc.name as "categoryName", dc.slug as "categorySlug"
      FROM documentation_articles da
      LEFT JOIN documentation_categories dc ON da.category_id = dc.id
      ORDER BY da.sort_order ASC, da.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, skip]);

    sendPaginated(res, itemsRes.rows, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getBySlug = async (req, res, next) => {
  try {
    const resDoc = await query(`
      SELECT da.*, dc.name as "categoryName", dc.slug as "categorySlug"
      FROM documentation_articles da
      LEFT JOIN documentation_categories dc ON da.category_id = dc.id
      WHERE da.slug = $1
    `, [req.params.slug]);

    if (!resDoc.rows.length) throw new AppError('Article not found', 404, 'NOT_FOUND');
    sendSuccess(res, { article: resDoc.rows[0] });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { title, content, categoryId, sortOrder } = req.body;
    const slug = (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'doc-' + Date.now();

    const resDoc = await query(`
      INSERT INTO documentation_articles (category_id, title, slug, content, sort_order)
      VALUES ($1, $2, $3, $4, COALESCE($5, 0))
      RETURNING *
    `, [categoryId || null, title, slug, content, sortOrder]);

    sendSuccess(res, { article: resDoc.rows[0] }, 'Article created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { title, content, categoryId, sortOrder } = req.body;
    const resDoc = await query(`
      UPDATE documentation_articles
      SET category_id = COALESCE($1, category_id),
          title = COALESCE($2, title),
          content = COALESCE($3, content),
          sort_order = COALESCE($4, sort_order),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [categoryId, title, content, sortOrder, req.params.id]);

    if (!resDoc.rows.length) throw new AppError('Article not found', 404, 'NOT_FOUND');
    sendSuccess(res, { article: resDoc.rows[0] }, 'Article updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM documentation_articles WHERE id = $1', [req.params.id]);
    sendSuccess(res, null, 'Article deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listCategories,
  listArticles,
  list: listArticles,
  getBySlug,
  create,
  update,
  remove,
};
