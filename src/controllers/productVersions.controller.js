const prisma = require('../config/database');
const auditService = require('../services/audit.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const where = { productId: req.params.productId };
    const versions = await prisma.productVersion.findMany({
      where,
      include: { _count: { select: { files: true } } },
      orderBy: { releaseDate: 'desc' },
    });
    sendSuccess(res, { versions });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = { ...req.body, productId: req.params.productId };
    if (data.releaseDate) data.releaseDate = new Date(data.releaseDate);

    const version = await prisma.productVersion.create({ data });
    sendSuccess(res, { version }, 'Version created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.releaseDate) data.releaseDate = new Date(data.releaseDate);

    const version = await prisma.productVersion.update({
      where: { id: req.params.id },
      data,
    });
    sendSuccess(res, { version }, 'Version updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.productVersion.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Version deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove };
