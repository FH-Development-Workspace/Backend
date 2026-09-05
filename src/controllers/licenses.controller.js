const { query } = require('../config/database');
const licenseService = require('../services/license.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const userId = req.user.id;
    const canViewAll = req.userPermissions?.includes('LICENSE_VIEW');

    let whereSql = '';
    let params = [];

    if (!canViewAll) {
      params.push(userId);
      whereSql = 'WHERE l.user_id = $1';
    }

    const countRes = await query(`SELECT COUNT(*) FROM licenses l ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const listParams = [...params, limit, skip];
    const itemsRes = await query(`
      SELECT l.*, p.name as "productName", p.slug as "productSlug", u.username as "userUsername"
      FROM licenses l
      JOIN products p ON l.product_id = p.id
      JOIN users u ON l.user_id = u.id
      ${whereSql}
      ORDER BY l.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, listParams);

    sendPaginated(res, itemsRes.rows, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const resLic = await query(`
      SELECT l.*, p.name as "productName", p.slug as "productSlug", u.username as "userUsername"
      FROM licenses l
      JOIN products p ON l.product_id = p.id
      JOIN users u ON l.user_id = u.id
      WHERE l.id = $1
    `, [req.params.id]);

    if (!resLic.rows.length) throw new AppError('License not found', 404, 'NOT_FOUND');
    const license = resLic.rows[0];

    const canViewAll = req.userPermissions?.includes('LICENSE_VIEW');
    if (!canViewAll && license.user_id !== req.user.id) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    sendSuccess(res, { license });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const license = await licenseService.createLicense(req.body, req.user.id, req);
    sendSuccess(res, { license }, 'License created', 201);
  } catch (err) {
    next(err);
  }
};

const activate = async (req, res, next) => {
  try {
    const { licenseKey, hwid, userAgent } = req.body;
    const result = await licenseService.activateLicense(licenseKey, hwid, userAgent, req);
    sendSuccess(res, result, 'License activated');
  } catch (err) {
    next(err);
  }
};

const deactivate = async (req, res, next) => {
  try {
    const { licenseKey, hwid } = req.body;
    const result = await licenseService.deactivateLicense(licenseKey, hwid, req.user.id);
    sendSuccess(res, result, 'License deactivated');
  } catch (err) {
    next(err);
  }
};

const revoke = async (req, res, next) => {
  try {
    const license = await licenseService.revokeLicense(req.params.id, req.user.id, req);
    sendSuccess(res, { license }, 'License revoked');
  } catch (err) {
    next(err);
  }
};

const renew = async (req, res, next) => {
  try {
    const { expiresAt } = req.body;
    const license = await licenseService.renewLicense(req.params.id, expiresAt, req.user.id);
    sendSuccess(res, { license }, 'License renewed');
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await query("UPDATE licenses SET status = 'REVOKED' WHERE id = $1", [req.params.id]);
    sendSuccess(res, null, 'License deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, activate, deactivate, revoke, renew, softDelete };
