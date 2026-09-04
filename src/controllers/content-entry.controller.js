const prisma = require('../config/database');
const { AppError } = require('../middleware/error.middleware');
const { sendSuccess } = require('../utils/response');

const publicWhere = (type) => ({ type, published: true, OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }] });

const list = async (req, res, next) => {
  try {
    const entries = await prisma.contentEntry.findMany({ where: publicWhere(req.contentType), orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }] });
    sendSuccess(res, { entries });
  } catch (err) { next(err); }
};

const listAdmin = async (req, res, next) => {
  try {
    const entries = await prisma.contentEntry.findMany({ where: { type: req.contentType }, orderBy: { updatedAt: 'desc' } });
    sendSuccess(res, { entries });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = { ...req.body, type: req.contentType, publishedAt: req.body.publishedAt ? new Date(req.body.publishedAt) : undefined, createdBy: req.user.id };
    const entry = await prisma.contentEntry.create({ data });
    sendSuccess(res, { entry }, 'Content entry created', 201);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const entry = await prisma.contentEntry.findFirst({ where: { id: req.params.id, type: req.contentType } });
    if (!entry) throw new AppError('Content entry not found', 404, 'NOT_FOUND');
    const data = { ...req.body, publishedAt: req.body.publishedAt ? new Date(req.body.publishedAt) : undefined };
    const updated = await prisma.contentEntry.update({ where: { id: entry.id }, data });
    sendSuccess(res, { entry: updated }, 'Content entry updated');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const result = await prisma.contentEntry.deleteMany({ where: { id: req.params.id, type: req.contentType } });
    if (!result.count) throw new AppError('Content entry not found', 404, 'NOT_FOUND');
    sendSuccess(res, null, 'Content entry deleted');
  } catch (err) { next(err); }
};

module.exports = { list, listAdmin, create, update, remove };