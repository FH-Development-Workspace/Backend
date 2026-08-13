const prisma = require('../config/database');
const licenseService = require('../services/license.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { deletedAt: null };
    if (req.query.status) where.status = req.query.status;
    if (req.query.productId) where.productId = req.query.productId;
    if (req.query.userId) where.userId = req.query.userId;

    const [items, total] = await Promise.all([
      prisma.license.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, username: true, email: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.license.count({ where }),
    ]);

    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
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

const getById = async (req, res, next) => {
  try {
    const license = await prisma.license.findUnique({
      where: { id: req.params.id },
      include: {
        product: true,
        user: { select: { id: true, username: true, email: true } },
        activations: true,
        events: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!license) throw new AppError('License not found', 404, 'NOT_FOUND');
    sendSuccess(res, { license });
  } catch (err) {
    next(err);
  }
};

const activate = async (req, res, next) => {
  try {
    const result = await licenseService.activateLicense(
      req.body.licenseKey,
      req.body.machineId,
      req.body.machineName,
      req
    );
    sendSuccess(res, result, 'License activated');
  } catch (err) {
    next(err);
  }
};

const deactivate = async (req, res, next) => {
  try {
    await licenseService.deactivateLicense(req.body.licenseKey, req.body.machineId, req.user.id);
    sendSuccess(res, null, 'License deactivated');
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
    const license = await licenseService.renewLicense(req.params.id, req.body.expiresAt, req.user.id);
    sendSuccess(res, { license }, 'License renewed');
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await prisma.license.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), deletedBy: req.user.id, status: 'REVOKED' },
    });
    sendSuccess(res, null, 'License deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, getById, activate, deactivate, revoke, renew, softDelete };
