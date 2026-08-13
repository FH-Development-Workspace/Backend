const prisma = require('../config/database');
const { createUniqueSlug } = require('../utils/slug');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { deletedAt: null };
    if (req.query.published !== 'false') where.status = 'PUBLISHED';

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: { category: true, technologies: true, images: { orderBy: { displayOrder: 'asc' } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getBySlug = async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { slug: req.params.slug, deletedAt: null, status: 'PUBLISHED' },
      include: { category: true, technologies: true, images: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!project) throw new AppError('Project not found', 404, 'NOT_FOUND');
    sendSuccess(res, { project });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const slug = await createUniqueSlug(req.body.name, prisma.project);
    const project = await prisma.project.create({ data: { ...req.body, slug } });
    sendSuccess(res, { project }, 'Project created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const project = await prisma.project.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, { project }, 'Project updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.project.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    sendSuccess(res, null, 'Project deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getBySlug, create, update, remove };
