const prisma = require('../config/database');
const { sendSuccess } = require('../utils/response');

const listCategories = async (req, res, next) => {
  try {
    const categories = await prisma.fAQCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { faqs: { where: { status: 'PUBLISHED' }, orderBy: { displayOrder: 'asc' } } },
    });
    sendSuccess(res, { categories });
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const where = {};
    if (!req.userPermissions?.includes('FAQ_VIEW')) where.status = 'PUBLISHED';
    if (req.query.search) {
      where.OR = [
        { question: { contains: req.query.search, mode: 'insensitive' } },
        { answer: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }

    const faqs = await prisma.fAQ.findMany({
      where,
      include: { category: true },
      orderBy: { displayOrder: 'asc' },
    });
    sendSuccess(res, { faqs });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const faq = await prisma.fAQ.create({ data: req.body });
    sendSuccess(res, { faq }, 'FAQ created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const faq = await prisma.fAQ.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, { faq }, 'FAQ updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.fAQ.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'FAQ deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { listCategories, list, create, update, remove };
