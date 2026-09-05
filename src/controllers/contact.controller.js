const { query } = require('../config/database');
const emailService = require('../services/email.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const submit = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      throw new AppError('Name, email, and message are required', 400, 'BAD_REQUEST');
    }

    const contactRes = await query(`
      INSERT INTO contact_messages (name, email, subject, message, status)
      VALUES ($1, $2, $3, $4, 'NEW')
      RETURNING *
    `, [name, email, subject || null, message]);

    await emailService.sendTemplate(email, 'contactReceived', { name, message });

    sendSuccess(res, { contact: contactRes.rows[0] }, 'Contact message received', 201);
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const countRes = await query('SELECT COUNT(*) FROM contact_messages');
    const total = parseInt(countRes.rows[0].count, 10);

    const itemsRes = await query(`
      SELECT * FROM contact_messages
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, skip]);

    sendPaginated(res, itemsRes.rows, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const resContact = await query('SELECT * FROM contact_messages WHERE id = $1', [req.params.id]);
    if (!resContact.rows.length) throw new AppError('Contact message not found', 404, 'NOT_FOUND');
    sendSuccess(res, { contact: resContact.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const resContact = await query(`
      UPDATE contact_messages
      SET status = COALESCE($1, status)
      WHERE id = $2
      RETURNING *
    `, [status, req.params.id]);

    if (!resContact.rows.length) throw new AppError('Contact message not found', 404, 'NOT_FOUND');
    sendSuccess(res, { contact: resContact.rows[0] }, 'Status updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { submit, list, getById, updateStatus };
