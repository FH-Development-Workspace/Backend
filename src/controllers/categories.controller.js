const prisma = require('../config/database');
const { createUniqueSlug } = require('../utils/slug');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const categories = await prisma.productCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    sendSuccess(res, { categories });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const slug = await createUniqueSlug(req.body.name, prisma.productCategory);
    const category = await prisma.productCategory.create({ data: { ...req.body, slug } });
    sendSuccess(res, { category }, 'Category created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const category = await prisma.productCategory.update({
      where: { id: req.params.id },
      data: req.body,
    });
    sendSuccess(res, { category }, 'Category updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.productCategory.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Category deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove };
