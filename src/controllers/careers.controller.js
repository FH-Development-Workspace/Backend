const { query } = require('../config/database');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const countRes = await query("SELECT COUNT(*) FROM jobs WHERE status = 'OPEN'");
    const total = parseInt(countRes.rows[0].count, 10);

    const itemsRes = await query(`
      SELECT * FROM jobs
      WHERE status = 'OPEN'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, skip]);

    sendPaginated(res, itemsRes.rows, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const listAll = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const countRes = await query('SELECT COUNT(*) FROM jobs');
    const total = parseInt(countRes.rows[0].count, 10);

    const itemsRes = await query(`
      SELECT * FROM jobs
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
    const resJob = await query('SELECT * FROM jobs WHERE id::text = $1 OR title ILIKE $1', [req.params.slug]);
    if (!resJob.rows.length) throw new AppError('Job opening not found', 404, 'NOT_FOUND');
    sendSuccess(res, { job: resJob.rows[0] });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const resJob = await query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (!resJob.rows.length) throw new AppError('Job opening not found', 404, 'NOT_FOUND');
    sendSuccess(res, { job: resJob.rows[0] });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { title, department, location, type, description, requirements } = req.body;
    const resJob = await query(`
      INSERT INTO jobs (title, department, location, type, description, requirements, status)
      VALUES ($1, $2, COALESCE($3, 'Remote'), COALESCE($4, 'FULL_TIME'), $5, $6, 'OPEN')
      RETURNING *
    `, [title, department, location, type, description, requirements || null]);

    sendSuccess(res, { job: resJob.rows[0] }, 'Job posted', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { title, department, location, type, description, requirements, status } = req.body;
    const resJob = await query(`
      UPDATE jobs
      SET title = COALESCE($1, title),
          department = COALESCE($2, department),
          location = COALESCE($3, location),
          type = COALESCE($4, type),
          description = COALESCE($5, description),
          requirements = COALESCE($6, requirements),
          status = COALESCE($7, status),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [title, department, location, type, description, requirements, status, req.params.id]);

    if (!resJob.rows.length) throw new AppError('Job opening not found', 404, 'NOT_FOUND');
    sendSuccess(res, { job: resJob.rows[0] }, 'Job updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM jobs WHERE id = $1', [req.params.id]);
    sendSuccess(res, null, 'Job deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, listAll, getBySlug, getById, create, update, remove };
