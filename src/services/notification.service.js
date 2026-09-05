const { query } = require('../config/database');

const create = async (userId, { type = 'SYSTEM', title, message, link = null }) => {
  const res = await query(`
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [userId, type, title, message, link]);
  return res.rows[0];
};

const createMany = async (userIds, payload) => {
  if (!userIds.length) return [];
  const results = [];
  for (const userId of userIds) {
    const item = await create(userId, payload);
    results.push(item);
  }
  return results;
};

const getUserNotifications = async (userId, { limit = 20, skip = 0, unreadOnly = false }) => {
  let where = 'WHERE user_id = $1';
  const params = [userId];

  if (unreadOnly) {
    where += ' AND is_read = false';
  }

  const countRes = await query(`SELECT COUNT(*) FROM notifications ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const itemsRes = await query(`
    SELECT id, type, title, message, link, is_read as "isRead", created_at as "createdAt"
    FROM notifications
    ${where}
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `, [userId, limit, skip]);

  return { items: itemsRes.rows, total };
};

const markAsRead = async (id, userId) => {
  const res = await query(`
    UPDATE notifications
    SET is_read = true
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `, [id, userId]);
  return res.rows[0];
};

const markAllAsRead = async (userId) => {
  const res = await query(`
    UPDATE notifications
    SET is_read = true
    WHERE user_id = $1 AND is_read = false
  `, [userId]);
  return res.rowCount;
};

const getPreferences = async (userId) => {
  const res = await query('SELECT channel, enabled FROM notification_preferences WHERE user_id = $1', [userId]);
  return res.rows;
};

const updatePreference = async (userId, channel, enabled) => {
  const res = await query(`
    INSERT INTO notification_preferences (user_id, channel, enabled)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, channel) DO UPDATE
    SET enabled = EXCLUDED.enabled
    RETURNING *
  `, [userId, channel, enabled]);
  return res.rows[0];
};

module.exports = {
  create,
  createMany,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreference,
};
