const prisma = require('../config/database');
const { createUniqueSlug } = require('../utils/slug');
const { sendSuccess } = require('../utils/response');

const list = async (req, res, next) => {
  try {
    const where = req.query.all === 'true' ? {} : { published: true };
    const partners = await prisma.partner.findMany({ where, orderBy: { displayOrder: 'asc' } });
    sendSuccess(res, { partners });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const slug = await createUniqueSlug(req.body.name, prisma.partner);
    const partner = await prisma.partner.create({ data: { ...req.body, slug } });
    sendSuccess(res, { partner }, 'Partner created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const partner = await prisma.partner.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, { partner }, 'Partner updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.partner.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Partner deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove };
