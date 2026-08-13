const prisma = require('../config/database');
const { createUniqueSlug } = require('../utils/slug');
const analyticsService = require('../services/analytics.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const listCategories = async (req, res, next) => {
  try {
    const categories = await prisma.documentationCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { articles: true } }, children: true },
      where: { parentId: null },
    });
    sendSuccess(res, { categories });
  } catch (err) {
    next(err);
  }
};

const listArticles = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { deletedAt: null };
    if (!req.userPermissions?.includes('DOC_VIEW')) where.status = 'PUBLISHED';
    if (req.query.category) where.category = { slug: req.query.category };

    const [items, total] = await Promise.all([
      prisma.documentationArticle.findMany({
        where,
        include: { category: true },
        skip,
        take: limit,
        orderBy: [{ category: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
      }),
      prisma.documentationArticle.count({ where }),
    ]);

    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getBySlug = async (req, res, next) => {
  try {
    const where = { slug: req.params.slug, deletedAt: null };
    if (!req.userPermissions?.includes('DOC_VIEW')) where.status = 'PUBLISHED';

    const article = await prisma.documentationArticle.findFirst({
      where,
      include: { category: true, versions: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (!article) throw new AppError('Article not found', 404, 'NOT_FOUND');

    await analyticsService.logEvent('DOC_VIEW', {
      userId: req.user?.id,
      resource: 'documentation',
      resourceId: article.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { article });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const slug = await createUniqueSlug(req.body.title, prisma.documentationArticle);
    const article = await prisma.documentationArticle.create({ data: { ...req.body, slug } });
    sendSuccess(res, { article }, 'Article created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const article = await prisma.documentationArticle.update({
      where: { id: req.params.id },
      data: req.body,
    });
    sendSuccess(res, { article }, 'Article updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.documentationArticle.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    sendSuccess(res, null, 'Article deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { listCategories, listArticles, getBySlug, create, update, remove };
