const { query } = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const type = req.contentType || 'general';
    const resEntries = await query('SELECT key as id, value FROM system_settings WHERE key LIKE $1', [`content_${type}_%`]);
    const entries = resEntries.rows.map(r => ({ id: r.id, ...(typeof r.value === 'string' ? JSON.parse(r.value) : r.value) }));
    sendSuccess(res, { entries });
  } catch (err) {
    next(err);
  }
};

const listAdmin = async (req, res, next) => {
  return list(req, res, next);
};

const create = async (req, res, next) => {
  try {
    const type = req.contentType || req.body.type || 'general';
    const key = `content_${type}_${Date.now()}`;
    const value = JSON.stringify({ ...req.body, type });

    await query(`
      INSERT INTO system_settings (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW()
    `, [key, value]);

    sendSuccess(res, { entry: { id: key, ...req.body, type } }, 'Content entry created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const key = req.params.id;
    const value = JSON.stringify(req.body);

    const resEntry = await query(`
      UPDATE system_settings
      SET value = $1, updated_at = NOW()
      WHERE key = $2
      RETURNING *
    `, [value, key]);

    if (!resEntry.rows.length) throw new AppError('Content entry not found', 404, 'NOT_FOUND');
    sendSuccess(res, { entry: { id: key, ...req.body } }, 'Content entry updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM system_settings WHERE key = $1', [req.params.id]);
    sendSuccess(res, null, 'Content entry deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, listAdmin, create, update, upsert: create, remove };