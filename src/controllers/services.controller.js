const { query } = require('../config/database');
const auditService = require('../services/audit.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const formatService = (s) => ({
  id: s.id,
  name: s.name,
  slug: s.slug,
  summary: s.summary,
  description: s.description,
  priceGBP: parseFloat(s.price_gbp || 0),
  features: typeof s.features === 'string' ? JSON.parse(s.features) : (s.features || []),
  active: s.active,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
});

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    let whereClauses = [];
    let params = [];

    if (req.query.active === 'true') {
      whereClauses.push('active = true');
    }
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      whereClauses.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM services ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const listParams = [...params, limit, skip];
    const itemsRes = await query(`
      SELECT * FROM services
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, listParams);

    sendPaginated(res, itemsRes.rows.map(formatService), buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getBySlug = async (req, res, next) => {
  try {
    const resService = await query('SELECT * FROM services WHERE slug = $1', [req.params.slug]);
    if (!resService.rows.length) throw new AppError('Service not found', 404, 'NOT_FOUND');
    sendSuccess(res, { service: formatService(resService.rows[0]) });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, summary, description, priceGBP, features, active } = req.body;
    const slug = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'service-' + Date.now();

    const resService = await query(`
      INSERT INTO services (name, slug, summary, description, price_gbp, features, active)
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, true))
      RETURNING *
    `, [name, slug, summary || null, description, priceGBP || 0.00, JSON.stringify(features || []), active]);

    sendSuccess(res, { service: formatService(resService.rows[0]) }, 'Service created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { name, summary, description, priceGBP, features, active } = req.body;
    const resService = await query(`
      UPDATE services
      SET name = COALESCE($1, name),
          summary = COALESCE($2, summary),
          description = COALESCE($3, description),
          price_gbp = COALESCE($4, price_gbp),
          features = COALESCE($5, features),
          active = COALESCE($6, active),
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [name, summary, description, priceGBP, features ? JSON.stringify(features) : null, active, req.params.id]);

    if (!resService.rows.length) throw new AppError('Service not found', 404, 'NOT_FOUND');
    sendSuccess(res, { service: formatService(resService.rows[0]) }, 'Service updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('UPDATE services SET active = false, updated_at = NOW() WHERE id = $1', [req.params.id]);
    sendSuccess(res, null, 'Service deactivated');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getBySlug, create, update, remove };
