const prisma = require('../config/database');
const { createUniqueSlug } = require('../utils/slug');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { deletedAt: null, status: 'PUBLISHED' };

    const [items, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: { department: true },
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.job.count({ where }),
    ]);

    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getBySlug = async (req, res, next) => {
  try {
    const job = await prisma.job.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED', deletedAt: null },
      include: { department: true },
    });
    if (!job) throw new AppError('Job not found', 404, 'NOT_FOUND');

    const { applications, ...publicJob } = job;
    sendSuccess(res, { job: publicJob });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const slug = await createUniqueSlug(req.body.title, prisma.job);
    const job = await prisma.job.create({
      data: {
        ...req.body,
        slug,
        closesAt: req.body.closesAt ? new Date(req.body.closesAt) : null,
      },
    });
    sendSuccess(res, { job }, 'Job created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.closesAt) data.closesAt = new Date(data.closesAt);
    if (data.status === 'PUBLISHED' && !data.publishedAt) data.publishedAt = new Date();

    const job = await prisma.job.update({ where: { id: req.params.id }, data });
    sendSuccess(res, { job }, 'Job updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.job.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), deletedBy: req.user.id },
    });
    sendSuccess(res, null, 'Job deleted');
  } catch (err) {
    next(err);
  }
};

const listAll = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { deletedAt: null };
    if (req.query.status) where.status = req.query.status;

    const [items, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: { department: true, _count: { select: { applications: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.job.count({ where }),
    ]);

    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getBySlug, create, update, remove, listAll };
