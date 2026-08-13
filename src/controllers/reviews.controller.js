const prisma = require('../config/database');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { status: 'APPROVED' };
    if (req.query.productId) where.productId = req.query.productId;

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, profile: { select: { displayName: true, avatar: true } } } },
          product: { select: { id: true, name: true, slug: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where }),
    ]);

    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const existing = await prisma.review.findFirst({
      where: { userId: req.user.id, productId: req.body.productId },
    });
    if (existing) throw new AppError('You have already reviewed this product', 409, 'CONFLICT');

    const review = await prisma.review.create({
      data: { ...req.body, userId: req.user.id, status: 'PENDING' },
    });
    sendSuccess(res, { review }, 'Review submitted for moderation', 201);
  } catch (err) {
    next(err);
  }
};

const moderate = async (req, res, next) => {
  try {
    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    sendSuccess(res, { review }, 'Review updated');
  } catch (err) {
    next(err);
  }
};

const listPending = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { status: 'PENDING' };

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, username: true } },
          product: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where }),
    ]);

    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, moderate, listPending };
