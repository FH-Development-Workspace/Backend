const { query } = require('../config/database');
const authService = require('../services/auth.service');
const licenseService = require('../services/license.service');
const downloadService = require('../services/download.service');
const notificationService = require('../services/notification.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { sanitizeUser } = require('../utils/permissions');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const getAccount = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    sendSuccess(res, { user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

const updateAccount = async (req, res, next) => {
  try {
    const { username, email } = req.body;
    const userId = req.user.id;

    if (username || email) {
      await query(`
        UPDATE users
        SET username = COALESCE($1, username),
            email = COALESCE($2, email),
            updated_at = NOW()
        WHERE id = $3
      `, [username, email, userId]);
    }

    const user = await authService.getMe(userId);
    sendSuccess(res, { user: sanitizeUser(user) }, 'Account updated');
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, displayName, avatar, bio, company, website } = req.body;
    const userId = req.user.id;

    await query(`
      INSERT INTO profiles (user_id, first_name, last_name, display_name, avatar, bio, company, website)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE
      SET first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
          last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
          display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
          avatar = COALESCE(EXCLUDED.avatar, profiles.avatar),
          bio = COALESCE(EXCLUDED.bio, profiles.bio),
          company = COALESCE(EXCLUDED.company, profiles.company),
          website = COALESCE(EXCLUDED.website, profiles.website),
          updated_at = NOW()
    `, [userId, firstName || null, lastName || null, displayName || null, avatar || null, bio || null, company || null, website || null]);

    const updatedUser = await authService.getMe(userId);
    sendSuccess(res, { user: sanitizeUser(updatedUser) }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (!userRes.rows.length) throw new AppError('User not found', 404, 'NOT_FOUND');

    const isValid = await authService.comparePassword(currentPassword, userRes.rows[0].password_hash);
    if (!isValid) throw new AppError('Current password incorrect', 400, 'INVALID_PASSWORD');

    const newHash = await authService.hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

    sendSuccess(res, null, 'Password updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const { currentPassword } = req.body;
    const userId = req.user.id;

    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (!userRes.rows.length) throw new AppError('User not found', 404, 'NOT_FOUND');

    const isValid = await authService.comparePassword(currentPassword, userRes.rows[0].password_hash);
    if (!isValid) throw new AppError('Current password incorrect', 400, 'INVALID_PASSWORD');

    await query("UPDATE users SET status = 'DELETED', deleted_at = NOW(), deleted_by = $1 WHERE id = $1", [userId]);
    sendSuccess(res, null, 'Account deleted');
  } catch (err) {
    next(err);
  }
};

const getSessions = async (req, res, next) => {
  try {
    const sessionsRes = await query(`
      SELECT id, user_agent, ip_address, expires_at, created_at
      FROM sessions
      WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
    `, [req.user.id]);
    sendSuccess(res, { sessions: sessionsRes.rows });
  } catch (err) {
    next(err);
  }
};

const revokeSession = async (req, res, next) => {
  try {
    await query("UPDATE sessions SET revoked_at = NOW() WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
    sendSuccess(res, null, 'Session revoked');
  } catch (err) {
    next(err);
  }
};

const getDownloads = async (req, res, next) => {
  try {
    const { limit, skip } = getPagination(req.query);
    const downloads = await downloadService.getUserDownloads(req.user.id, { limit, skip });
    sendSuccess(res, downloads);
  } catch (err) {
    next(err);
  }
};

const getLicenses = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const result = await licenseService.getUserLicenses(req.user.id, { limit, skip });
    sendPaginated(res, result.items, buildPaginationMeta(page, limit, result.total));
  } catch (err) {
    next(err);
  }
};

const getSupportTickets = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const countRes = await query('SELECT COUNT(*) FROM support_tickets WHERE user_id = $1', [req.user.id]);
    const total = parseInt(countRes.rows[0].count, 10);

    const itemsRes = await query(`
      SELECT st.*, COUNT(tm.id) as "messageCount"
      FROM support_tickets st
      LEFT JOIN ticket_messages tm ON tm.ticket_id = st.id
      WHERE st.user_id = $1
      GROUP BY st.id
      ORDER BY st.updated_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, limit, skip]);

    sendPaginated(res, itemsRes.rows, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const { limit, skip } = getPagination(req.query);
    const result = await notificationService.getUserNotifications(req.user.id, { limit, skip });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAccount,
  updateAccount,
  updateProfile,
  changePassword,
  deleteAccount,
  getSessions,
  revokeSession,
  getDownloads,
  getLicenses,
  getSupportTickets,
  getNotifications,
};
