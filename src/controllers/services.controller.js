const prisma = require('../config/database');
const { createUniqueSlug } = require('../utils/slug');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { deletedAt: null };
    if (req.query.published === 'true') where.published = true;

    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: { category: true, features: { orderBy: { displayOrder: 'asc' } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.service.count({ where }),
    ]);

    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getBySlug = async (req, res, next) => {
  try {
    const where = { slug: req.params.slug, deletedAt: null };
    if (!req.userPermissions?.includes('SERVICE_VIEW')) where.published = true;

    const service = await prisma.service.findFirst({
      where,
      include: { category: true, features: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!service) throw new AppError('Service not found', 404, 'NOT_FOUND');
    sendSuccess(res, { service });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const slug = await createUniqueSlug(req.body.name, prisma.service);
    const service = await prisma.service.create({ data: { ...req.body, slug } });
    sendSuccess(res, { service }, 'Service created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const service = await prisma.service.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, { service }, 'Service updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.service.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    sendSuccess(res, null, 'Service deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getBySlug, create, update, remove };
