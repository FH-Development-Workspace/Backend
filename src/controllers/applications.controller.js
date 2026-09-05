const { query } = require('../config/database');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const apply = async (req, res, next) => {
  try {
    const { jobId, fullName, email, phone, resumeUrl, coverLetter } = req.body;
    if (!jobId || !fullName || !email || !resumeUrl) {
      throw new AppError('jobId, fullName, email, and resumeUrl are required', 400, 'BAD_REQUEST');
    }

    const jobRes = await query("SELECT id FROM jobs WHERE id = $1 AND status = 'OPEN'", [jobId]);
    if (!jobRes.rows.length) throw new AppError('Job opening not available', 404, 'NOT_FOUND');

    const appRes = await query(`
      INSERT INTO job_applications (job_id, full_name, email, phone, resume_url, cover_letter, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
      RETURNING *
    `, [jobId, fullName, email, phone || null, resumeUrl, coverLetter || null]);

    sendSuccess(res, { application: appRes.rows[0] }, 'Application submitted', 201);
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const countRes = await query('SELECT COUNT(*) FROM job_applications');
    const total = parseInt(countRes.rows[0].count, 10);

    const itemsRes = await query(`
      SELECT ja.*, j.title as "jobTitle", j.department as "jobDepartment"
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      ORDER BY ja.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, skip]);

    sendPaginated(res, itemsRes.rows, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const appRes = await query(`
      SELECT ja.*, j.title as "jobTitle", j.department as "jobDepartment"
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      WHERE ja.id = $1
    `, [req.params.id]);

    if (!appRes.rows.length) throw new AppError('Application not found', 404, 'NOT_FOUND');
    sendSuccess(res, { application: appRes.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const appRes = await query(`
      UPDATE job_applications
      SET status = COALESCE($1, status)
      WHERE id = $2
      RETURNING *
    `, [status, req.params.id]);

    if (!appRes.rows.length) throw new AppError('Application not found', 404, 'NOT_FOUND');
    sendSuccess(res, { application: appRes.rows[0] }, 'Status updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { apply, list, getById, updateStatus };
