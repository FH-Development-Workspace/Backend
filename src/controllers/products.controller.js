const { query } = require('../config/database');
const { createUniqueSlug } = require('../utils/slug');
const auditService = require('../services/audit.service');
const analyticsService = require('../services/analytics.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const formatProduct = (p) => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  summary: p.summary,
  description: p.description,
  priceGBP: parseFloat(p.price_gbp || 0),
  isFree: p.is_free,
  status: p.status,
  featured: p.featured,
  bannerUrl: p.banner_url,
  iconUrl: p.icon_url,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
  category: p.category_name ? {
    id: p.category_id,
    name: p.category_name,
    slug: p.category_slug,
  } : null,
});

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    let whereClauses = [];
    let params = [];

    if (req.query.featured === 'true') {
      whereClauses.push('p.featured = true');
    }
    if (req.query.status) {
      params.push(req.query.status);
      whereClauses.push(`p.status = $${params.length}`);
    } else if (req.query.published === 'true') {
      whereClauses.push("p.status = 'ACTIVE'");
    }
    if (req.query.category) {
      params.push(req.query.category);
      whereClauses.push(`c.slug = $${params.length}`);
    }
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      whereClauses.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await query(`
      SELECT COUNT(*) FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
    `, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const listParams = [...params, limit, skip];
    const itemsRes = await query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, listParams);

    const formatted = itemsRes.rows.map(formatProduct);
    sendPaginated(res, formatted, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getBySlug = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = $1
    `, [req.params.slug]);

    if (!result.rows.length) throw new AppError('Product not found', 404, 'NOT_FOUND');
    const product = formatProduct(result.rows[0]);

    await analyticsService.logEvent('PRODUCT_VIEW', {
      userId: req.user?.id,
      resource: 'product',
      resourceId: product.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { product });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, summary, description, priceGBP, isFree, status, featured, bannerUrl, iconUrl, categoryId } = req.body;
    const slug = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product-' + Date.now();

    const result = await query(`
      INSERT INTO products (category_id, name, slug, summary, description, price_gbp, is_free, status, featured, banner_url, icon_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'ACTIVE'), COALESCE($9, false), $10, $11)
      RETURNING *
    `, [
      categoryId || null, name, slug, summary || null, description,
      priceGBP || 0.00, isFree || false, status || 'ACTIVE', featured || false,
      bannerUrl || null, iconUrl || null
    ]);

    const product = formatProduct(result.rows[0]);

    await auditService.log({
      actorId: req.user.id,
      action: 'PRODUCT_CREATED',
      resource: 'product',
      resourceId: product.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { product }, 'Product created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { name, summary, description, priceGBP, isFree, status, featured, bannerUrl, iconUrl, categoryId } = req.body;

    const result = await query(`
      UPDATE products
      SET category_id = COALESCE($1, category_id),
          name = COALESCE($2, name),
          summary = COALESCE($3, summary),
          description = COALESCE($4, description),
          price_gbp = COALESCE($5, price_gbp),
          is_free = COALESCE($6, is_free),
          status = COALESCE($7, status),
          featured = COALESCE($8, featured),
          banner_url = COALESCE($9, banner_url),
          icon_url = COALESCE($10, icon_url),
          updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      categoryId, name, summary, description, priceGBP,
      isFree, status, featured, bannerUrl, iconUrl, req.params.id
    ]);

    if (!result.rows.length) throw new AppError('Product not found', 404, 'NOT_FOUND');
    const product = formatProduct(result.rows[0]);

    await auditService.log({
      actorId: req.user.id,
      action: 'PRODUCT_UPDATED',
      resource: 'product',
      resourceId: product.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { product }, 'Product updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query("UPDATE products SET status = 'DISCONTINUED', updated_at = NOW() WHERE id = $1", [req.params.id]);

    await auditService.log({
      actorId: req.user.id,
      action: 'PRODUCT_DELETED',
      resource: 'product',
      resourceId: req.params.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, null, 'Product deleted');
  } catch (err) {
    next(err);
  }
};

const publish = async (req, res, next) => {
  try {
    const result = await query("UPDATE products SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1 RETURNING *", [req.params.id]);
    if (!result.rows.length) throw new AppError('Product not found', 404, 'NOT_FOUND');

    await auditService.log({
      actorId: req.user.id,
      action: 'PRODUCT_PUBLISHED',
      resource: 'product',
      resourceId: req.params.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { product: formatProduct(result.rows[0]) }, 'Product published');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getBySlug, create, update, remove, publish };
