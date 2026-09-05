const { query } = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const check = async (req, res, next) => {
  try {
    const { ip, ipAddress, email, username } = req.query;
    const targetIp = ip || ipAddress;
    if (!targetIp && !email && !username) {
      throw new AppError('Identifier required for check', 422, 'VALIDATION_ERROR');
    }

    const resCheck = await query('SELECT * FROM ip_blacklist WHERE ip_address = $1', [targetIp || '']);
    const isBlacklisted = resCheck.rows.length > 0;
    sendSuccess(res, { blacklisted: isBlacklisted, entry: isBlacklisted ? resCheck.rows[0] : null });
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const resList = await query('SELECT * FROM ip_blacklist ORDER BY created_at DESC');
    sendSuccess(res, { blacklist: resList.rows });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { ipAddress, reason, expiresAt } = req.body;
    if (!ipAddress) throw new AppError('ipAddress is required', 400, 'BAD_REQUEST');

    const resEntry = await query(`
      INSERT INTO ip_blacklist (ip_address, reason, banned_by, expires_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (ip_address) DO UPDATE
      SET reason = EXCLUDED.reason, expires_at = EXCLUDED.expires_at
      RETURNING *
    `, [ipAddress, reason || null, req.user.id, expiresAt ? new Date(expiresAt) : null]);

    sendSuccess(res, { entry: resEntry.rows[0] }, 'IP added to blacklist', 201);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM ip_blacklist WHERE id = $1', [req.params.id]);
    sendSuccess(res, null, 'IP removed from blacklist');
  } catch (err) {
    next(err);
  }
};

module.exports = { check, list, create, add: create, remove };