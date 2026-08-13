const prisma = require('../config/database');
const authService = require('../services/auth.service');
const auditService = require('../services/audit.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { sanitizeUser } = require('../utils/permissions');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { deletedAt: null };
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
      where.OR = [
        { email: { contains: req.query.search, mode: 'insensitive' } },
        { username: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: true,
          roles: { include: { role: { select: { id: true, name: true, slug: true } } } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    sendPaginated(res, users.map(sanitizeUser), buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        profile: true,
        roles: { include: { role: true } },
      },
    });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    sendSuccess(res, { user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const passwordHash = await authService.hashPassword(req.body.password);
    const { roleIds, ...data } = req.body;

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        status: data.status || 'ACTIVE',
        emailVerified: true,
        profile: { create: {} },
      },
      include: { profile: true },
    });

    if (roleIds?.length) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
      });
    }

    await auditService.log({
      actorId: req.user.id,
      action: 'USER_CREATED',
      resource: 'user',
      resourceId: user.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { user: sanitizeUser(user) }, 'User created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { password, roleIds, ...data } = req.body;
    const updateData = { ...data };
    if (password) updateData.passwordHash = await authService.hashPassword(password);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      include: { profile: true },
    });

    if (roleIds) {
      await prisma.userRole.deleteMany({ where: { userId: user.id } });
      if (roleIds.length) {
        await prisma.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
        });
      }
    }

    await auditService.log({
      actorId: req.user.id,
      action: 'USER_UPDATED',
      resource: 'user',
      resourceId: user.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { user: sanitizeUser(user) }, 'User updated');
  } catch (err) {
    next(err);
  }
};

const suspend = async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'SUSPENDED' },
    });
    await auditService.log({
      actorId: req.user.id,
      action: 'USER_SUSPENDED',
      resource: 'user',
      resourceId: user.id,
      ipAddress: req.ip,
    });
    sendSuccess(res, { user: sanitizeUser(user) }, 'User suspended');
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'DELETED', deletedAt: new Date(), deletedBy: req.user.id },
    });
    await auditService.log({
      actorId: req.user.id,
      action: 'USER_DELETED',
      resource: 'user',
      resourceId: user.id,
      ipAddress: req.ip,
    });
    sendSuccess(res, null, 'User deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, suspend, softDelete };
