const prisma = require('../config/database');
const authService = require('../services/auth.service');
const downloadService = require('../services/download.service');
const licenseService = require('../services/license.service');
const notificationService = require('../services/notification.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const getAccount = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    sendSuccess(res, { user, permissions: req.userPermissions, roles: req.userRoles });
  } catch (err) {
    next(err);
  }
};

const updateAccount = async (req, res, next) => {
  try {
    const { email, username } = req.body;
    const data = {};
    if (email) data.email = email;
    if (username) data.username = username;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      include: { profile: true },
    });
    const { passwordHash: _, ...safe } = user;
    sendSuccess(res, { user: safe }, 'Account updated');
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = await prisma.profile.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, ...req.body },
      update: req.body,
    });
    sendSuccess(res, { profile }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await authService.comparePassword(req.body.currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');

    const passwordHash = await authService.hashPassword(req.body.newPassword);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
    sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await authService.comparePassword(req.body.currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');

    const suffix = `${user.id}.${Date.now()}`;
    await prisma.$transaction([
      prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
          username: `deleted-${suffix}`,
          email: `deleted-${suffix}@invalid.local`,
        },
      }),
    ]);
    sendSuccess(res, null, 'Account deleted');
  } catch (err) {
    next(err);
  }
};

const getSessions = async (req, res, next) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, { sessions });
  } catch (err) {
    next(err);
  }
};

const revokeSession = async (req, res, next) => {
  try {
    await prisma.session.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { revokedAt: new Date() },
    });
    sendSuccess(res, null, 'Session revoked');
  } catch (err) {
    next(err);
  }
};

const getDownloads = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { items, total } = await downloadService.getUserDownloads(req.user.id, { skip, limit });
    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getLicenses = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { items, total } = await licenseService.getUserLicenses(req.user.id, { skip, limit });
    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getSupportTickets = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { userId: req.user.id, deletedAt: null };
    const [items, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, ticketNumber: true, subject: true, status: true,
          priority: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);
    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { items, total } = await notificationService.getUserNotifications(req.user.id, {
      skip, limit, page, unreadOnly: req.query.unread === 'true',
    });
    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAccount,
  updateAccount,
  updateProfile,
  changePassword,
  deleteAccount,
  getSessions,
  revokeSession,
  getDownloads,
  getLicenses,
  getSupportTickets,
  getNotifications,
};
