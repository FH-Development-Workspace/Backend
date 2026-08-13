const prisma = require('../config/database');

const log = async ({ actorId, action, resource, resourceId, metadata, ipAddress, userAgent }) => {
  return prisma.auditLog.create({
    data: {
      actorId: actorId || null,
      action,
      resource,
      resourceId: resourceId || null,
      metadata: metadata || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });
};

const getLogs = async ({ page, limit, skip, action, resource, actorId, from, to }) => {
  const where = {};
  if (action) where.action = action;
  if (resource) where.resource = resource;
  if (actorId) where.actorId = actorId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total };
};

module.exports = { log, getLogs };
