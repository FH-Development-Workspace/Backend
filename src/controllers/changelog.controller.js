const prisma = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const where = {};
    if (!req.userPermissions?.includes('CHANGELOG_VIEW')) where.status = 'PUBLISHED';

    const releases = await prisma.changelogRelease.findMany({
      where,
      include: { items: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { releaseDate: 'desc' },
    });
    sendSuccess(res, { releases });
  } catch (err) {
    next(err);
  }
};

const getByVersion = async (req, res, next) => {
  try {
    const release = await prisma.changelogRelease.findUnique({
      where: { version: req.params.version },
      include: { items: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!release) throw new AppError('Release not found', 404, 'NOT_FOUND');
    sendSuccess(res, { release });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { items, ...data } = req.body;
    if (data.releaseDate) data.releaseDate = new Date(data.releaseDate);

    const release = await prisma.changelogRelease.create({
      data: {
        ...data,
        items: items ? { create: items } : undefined,
      },
      include: { items: true },
    });
    sendSuccess(res, { release }, 'Release created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const release = await prisma.changelogRelease.update({
      where: { id: req.params.id },
      data: req.body,
      include: { items: true },
    });
    sendSuccess(res, { release }, 'Release updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.changelogRelease.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Release deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getByVersion, create, update, remove };
