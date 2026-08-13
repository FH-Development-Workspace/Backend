const prisma = require('../config/database');
const { createUniqueSlug } = require('../utils/slug');
const { sendSuccess } = require('../utils/response');

const list = async (req, res, next) => {
  try {
    const where = req.query.all === 'true' ? {} : { published: true };
    const subsidiaries = await prisma.subsidiary.findMany({ where, orderBy: { displayOrder: 'asc' } });
    sendSuccess(res, { subsidiaries });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const slug = await createUniqueSlug(req.body.name, prisma.subsidiary);
    const subsidiary = await prisma.subsidiary.create({ data: { ...req.body, slug } });
    sendSuccess(res, { subsidiary }, 'Subsidiary created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const subsidiary = await prisma.subsidiary.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, { subsidiary }, 'Subsidiary updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.subsidiary.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Subsidiary deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove };
