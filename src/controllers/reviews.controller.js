const { query } = require('../config/database');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    let whereClauses = ["r.status = 'APPROVED'"];
    let params = [];

    if (req.query.productId) {
      params.push(req.query.productId);
      whereClauses.push(`r.product_id = $${params.length}`);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countRes = await query(`SELECT COUNT(*) FROM reviews r ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const listParams = [...params, limit, skip];
    const itemsRes = await query(`
      SELECT r.*, u.username as "userUsername", p.name as "productName"
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      ${whereSql}
      ORDER BY r.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, listParams);

    sendPaginated(res, itemsRes.rows, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const listPending = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const countRes = await query("SELECT COUNT(*) FROM reviews WHERE status = 'PENDING'");
    const total = parseInt(countRes.rows[0].count, 10);

    const itemsRes = await query(`
      SELECT r.*, u.username as "userUsername", p.name as "productName"
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      WHERE r.status = 'PENDING'
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, skip]);

    sendPaginated(res, itemsRes.rows, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400, 'BAD_REQUEST');
    }

    const resReview = await query(`
      INSERT INTO reviews (user_id, product_id, rating, comment, status)
      VALUES ($1, $2, $3, $4, 'PENDING')
      RETURNING *
    `, [req.user.id, productId || null, rating, comment || null]);

    sendSuccess(res, { review: resReview.rows[0] }, 'Review submitted for moderation', 201);
  } catch (err) {
    next(err);
  }
};

const moderate = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new AppError('Status must be APPROVED or REJECTED', 400, 'BAD_REQUEST');
    }

    const resReview = await query('UPDATE reviews SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
    if (!resReview.rows.length) throw new AppError('Review not found', 404, 'NOT_FOUND');

    sendSuccess(res, { review: resReview.rows[0] }, `Review ${status.toLowerCase()}`);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, listPending, create, moderate };
