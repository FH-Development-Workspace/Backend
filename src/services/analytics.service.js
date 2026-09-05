const { query } = require('../config/database');
const auditService = require('./audit.service');

const logEvent = async (type, data = {}) => {
  try {
    await auditService.log({
      actorId: data.userId || null,
      action: type,
      resource: data.resource || 'system',
      resourceId: data.resourceId || null,
      details: data.metadata || null,
      ipAddress: data.ipAddress || null,
    });
  } catch (err) {
    // Non-blocking
  }
};

const getOverview = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [usersRes, productsRes, ticketsRes, hostingRes] = await Promise.all([
    query("SELECT COUNT(*) FROM users WHERE status = 'ACTIVE'"),
    query("SELECT COUNT(*) FROM products WHERE status = 'ACTIVE'"),
    query('SELECT COUNT(*) FROM support_tickets WHERE created_at >= $1', [since]),
    query('SELECT COUNT(*) FROM hosting_requests WHERE created_at >= $1', [since]),
  ]);

  return {
    period: { days, since },
    totals: {
      users: parseInt(usersRes.rows[0].count, 10),
      products: parseInt(productsRes.rows[0].count, 10),
      tickets: parseInt(ticketsRes.rows[0].count, 10),
      hostingRequests: parseInt(hostingRes.rows[0].count, 10),
    },
  };
};

const getProductAnalytics = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const viewsRes = await query("SELECT COUNT(*) FROM audit_logs WHERE action = 'PRODUCT_VIEW' AND created_at >= $1", [since]);
  const licensesRes = await query(`
    SELECT p.id, p.name, p.slug, COUNT(l.id) as count
    FROM products p
    LEFT JOIN licenses l ON l.product_id = p.id AND l.created_at >= $1
    GROUP BY p.id, p.name, p.slug
    ORDER BY count DESC
    LIMIT 10
  `, [since]);

  return {
    views: parseInt(viewsRes.rows[0].count, 10),
    topProducts: licensesRes.rows,
  };
};

const getDownloadAnalytics = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const res = await query("SELECT COUNT(*) FROM audit_logs WHERE action = 'FILE_DOWNLOAD' AND created_at >= $1", [since]);
  return { total: parseInt(res.rows[0].count, 10) };
};

const getUserAnalytics = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [totalRes, newRes, loginsRes] = await Promise.all([
    query("SELECT COUNT(*) FROM users WHERE status = 'ACTIVE'"),
    query('SELECT COUNT(*) FROM users WHERE created_at >= $1', [since]),
    query("SELECT COUNT(*) FROM audit_logs WHERE action = 'LOGIN' AND created_at >= $1", [since]),
  ]);

  return {
    total: parseInt(totalRes.rows[0].count, 10),
    newUsers: parseInt(newRes.rows[0].count, 10),
    logins: parseInt(loginsRes.rows[0].count, 10),
  };
};

const getSupportAnalytics = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [statusRes, priorityRes] = await Promise.all([
    query('SELECT status, COUNT(*) as count FROM support_tickets WHERE created_at >= $1 GROUP BY status', [since]),
    query('SELECT priority, COUNT(*) as count FROM support_tickets WHERE created_at >= $1 GROUP BY priority', [since]),
  ]);

  return {
    byStatus: statusRes.rows.map(r => ({ status: r.status, count: parseInt(r.count, 10) })),
    byPriority: priorityRes.rows.map(r => ({ priority: r.priority, count: parseInt(r.count, 10) })),
  };
};

const getWebsiteAnalytics = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const eventsRes = await query(`
    SELECT action as type, COUNT(*) as count
    FROM audit_logs
    WHERE created_at >= $1
    GROUP BY action
  `, [since]);

  return { events: eventsRes.rows.map(r => ({ type: r.type, count: parseInt(r.count, 10) })) };
};

module.exports = {
  logEvent,
  getOverview,
  getProductAnalytics,
  getDownloadAnalytics,
  getUserAnalytics,
  getSupportAnalytics,
  getWebsiteAnalytics,
};
