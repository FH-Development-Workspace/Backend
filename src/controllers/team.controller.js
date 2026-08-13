const prisma = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const where = { published: true };
    const members = await prisma.teamMember.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true, name: true, position: true, bio: true,
        profileImage: true, socialLinks: true, displayOrder: true, department: true,
      },
    });
    sendSuccess(res, { members });
  } catch (err) {
    next(err);
  }
};

const listAll = async (req, res, next) => {
  try {
    const members = await prisma.teamMember.findMany({ orderBy: { displayOrder: 'asc' } });
    sendSuccess(res, { members });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const member = await prisma.teamMember.create({ data: req.body });
    sendSuccess(res, { member }, 'Team member created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const member = await prisma.teamMember.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, { member }, 'Team member updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.teamMember.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Team member deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, listAll, create, update, remove };
