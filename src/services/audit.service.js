const { query } = require('../config/database');

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

const log = async ({ actorId, action, resource, resourceId, details, ipAddress }) => {
  try {
    const validUserId = isUUID(actorId) ? actorId : null;
    const res = await query(`
      INSERT INTO audit_logs (user_id, action, resource, details, ip_address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [validUserId, action, resource, details ? JSON.stringify(details) : null, ipAddress || null]);
    return res.rows[0];
  } catch (err) {
    // Non-blocking for primary request
  }
};

const getLogs = async ({ limit = 20, skip = 0, action, resource, actorId }) => {
  let whereClauses = [];
  let params = [];

  if (action) {
    params.push(action);
    whereClauses.push(`a.action = $${params.length}`);
  }
  if (resource) {
    params.push(resource);
    whereClauses.push(`a.resource = $${params.length}`);
  }
  if (actorId) {
    params.push(actorId);
    whereClauses.push(`a.user_id = $${params.length}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(*) FROM audit_logs a ${whereSql}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const itemsParams = [...params, limit, skip];
  const itemsRes = await query(`
    SELECT a.*, u.username as "actorUsername", u.email as "actorEmail"
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ${whereSql}
    ORDER BY a.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, itemsParams);

  return { items: itemsRes.rows, total };
};

module.exports = { log, getLogs };
