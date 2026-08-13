const prisma = require('../config/database');
const { sendSuccess } = require('../utils/response');

const list = async (req, res, next) => {
  try {
    const where = {};
    if (!req.userPermissions?.includes('ROADMAP_VIEW')) where.isPublic = true;
    if (req.query.status) where.status = req.query.status;
    if (req.query.category) where.category = req.query.category;

    const items = await prisma.roadmapItem.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    sendSuccess(res, { items });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const item = await prisma.roadmapItem.create({ data: req.body });
    sendSuccess(res, { item }, 'Roadmap item created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await prisma.roadmapItem.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, { item }, 'Roadmap item updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.roadmapItem.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Roadmap item deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove };
