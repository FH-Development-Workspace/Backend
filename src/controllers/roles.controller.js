const prisma = require('../config/database');
const { sendSuccess } = require('../utils/response');

const listRoles = async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, { roles });
  } catch (err) {
    next(err);
  }
};

const createRole = async (req, res, next) => {
  try {
    const role = await prisma.role.create({ data: req.body });
    sendSuccess(res, { role }, 'Role created', 201);
  } catch (err) {
    next(err);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const role = await prisma.role.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, { role }, 'Role updated');
  } catch (err) {
    next(err);
  }
};

const assignPermissions = async (req, res, next) => {
  try {
    const { permissionIds } = req.body;
    await prisma.rolePermission.deleteMany({ where: { roleId: req.params.id } });
    if (permissionIds?.length) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: req.params.id, permissionId })),
      });
    }
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: { permissions: { include: { permission: true } } },
    });
    sendSuccess(res, { role }, 'Permissions updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { listRoles, createRole, updateRole, assignPermissions };
