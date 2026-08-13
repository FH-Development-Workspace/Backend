const prisma = require('../config/database');
const { sendSuccess } = require('../utils/response');

const list = async (req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
    sendSuccess(res, { permissions });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { resource, action, description } = req.body;
    const slug = `${resource}_${action}`.toUpperCase();
    const permission = await prisma.permission.create({
      data: { name: slug.replace(/_/g, ' '), slug, resource, action, description },
    });
    sendSuccess(res, { permission }, 'Permission created', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create };
