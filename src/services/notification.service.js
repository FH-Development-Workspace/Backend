const prisma = require('../config/database');

const create = async (userId, { type, title, message, data }) => {
  return prisma.notification.create({
    data: { userId, type, title, message, data: data || null },
  });
};

const createMany = async (userIds, payload) => {
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data || null,
    })),
  });
};

const getUserNotifications = async (userId, { page, limit, skip, unreadOnly }) => {
  const where = { userId };
  if (unreadOnly) where.read = false;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return { items, total };
};

const markAsRead = async (id, userId) => {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true, readAt: new Date() },
  });
};

const markAllAsRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  });
};

const getPreferences = async (userId) => {
  return prisma.notificationPreference.findMany({ where: { userId } });
};

const updatePreference = async (userId, type, enabled) => {
  return prisma.notificationPreference.upsert({
    where: { userId_type: { userId, type } },
    create: { userId, type, enabled },
    update: { enabled },
  });
};

module.exports = {
  create,
  createMany,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreference,
};
