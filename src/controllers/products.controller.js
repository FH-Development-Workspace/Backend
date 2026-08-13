const prisma = require('../config/database');
const { createUniqueSlug } = require('../utils/slug');
const auditService = require('../services/audit.service');
const analyticsService = require('../services/analytics.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const productInclude = {
  category: true,
  technologies: true,
  features: { orderBy: { displayOrder: 'asc' } },
  screenshots: { orderBy: { displayOrder: 'asc' } },
  versions: { orderBy: { releaseDate: 'desc' }, take: 5 },
  _count: { select: { reviews: true, downloads: true } },
};

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { deletedAt: null };
    if (req.query.published === 'true') where.published = true;
    if (req.query.featured === 'true') where.featured = true;
    if (req.query.status) where.status = req.query.status;
    if (req.query.category) where.category = { slug: req.query.category };
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { description: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = req.query.sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, technologies: true },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getBySlug = async (req, res, next) => {
  try {
    const where = { slug: req.params.slug, deletedAt: null };
    if (!req.userPermissions?.includes('PRODUCT_VIEW')) {
      where.published = true;
    }

    const product = await prisma.product.findFirst({
      where,
      include: productInclude,
    });

    if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

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
    const slug = await createUniqueSlug(req.body.name, prisma.product);
    const product = await prisma.product.create({
      data: { ...req.body, slug },
      include: productInclude,
    });

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
    const data = { ...req.body };
    if (data.name) {
      data.slug = await createUniqueSlug(data.name, prisma.product, 'slug', req.params.id);
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: productInclude,
    });

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
    await prisma.product.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), deletedBy: req.user.id },
    });

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
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { published: true, status: 'ACTIVE' },
    });

    await auditService.log({
      actorId: req.user.id,
      action: 'PRODUCT_PUBLISHED',
      resource: 'product',
      resourceId: product.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { product }, 'Product published');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getBySlug, create, update, remove, publish };
