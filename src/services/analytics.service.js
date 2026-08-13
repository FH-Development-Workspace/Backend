const prisma = require('../config/database');
const auditService = require('./audit.service');

const logEvent = async (type, data = {}) => {
  try {
    await prisma.analyticsEvent.create({
      data: {
        type,
        userId: data.userId || null,
        resource: data.resource || null,
        resourceId: data.resourceId || null,
        metadata: data.metadata || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  } catch (err) {
    // Analytics should not break main flow
  }
};

const getOverview = async (days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await prisma.analyticsEvent.groupBy({
    by: ['type'],
    where: { createdAt: { gte: since } },
    _count: { id: true },
  });

  const [users, products, downloads, tickets] = await Promise.all([
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.product.count({ where: { published: true, deletedAt: null } }),
    prisma.download.count({ where: { createdAt: { gte: since } } }),
    prisma.supportTicket.count({ where: { createdAt: { gte: since } } }),
  ]);

  return {
    period: { days, since },
    totals: { users, products, downloads, tickets },
    events: events.map((e) => ({ type: e.type, count: e._count.id })),
  };
};

const getProductAnalytics = async (days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const views = await prisma.analyticsEvent.count({
    where: { type: 'PRODUCT_VIEW', createdAt: { gte: since } },
  });

  const downloads = await prisma.download.groupBy({
    by: ['productId'],
    where: { createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const productIds = downloads.map((d) => d.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, slug: true },
  });

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  return {
    views,
    topDownloads: downloads.map((d) => ({
      product: productMap[d.productId],
      count: d._count.id,
    })),
  };
};

const getDownloadAnalytics = async (days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const total = await prisma.download.count({ where: { createdAt: { gte: since } } });
  const byStatus = await prisma.download.groupBy({
    by: ['status'],
    where: { createdAt: { gte: since } },
    _count: { id: true },
  });

  return { total, byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })) };
};

const getUserAnalytics = async (days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [total, newUsers, logins] = await Promise.all([
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.analyticsEvent.count({ where: { type: 'LOGIN', createdAt: { gte: since } } }),
  ]);

  return { total, newUsers, logins };
};

const getSupportAnalytics = async (days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const byStatus = await prisma.supportTicket.groupBy({
    by: ['status'],
    where: { createdAt: { gte: since } },
    _count: { id: true },
  });

  const byPriority = await prisma.supportTicket.groupBy({
    by: ['priority'],
    where: { createdAt: { gte: since } },
    _count: { id: true },
  });

  return {
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
    byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count.id })),
  };
};

const getWebsiteAnalytics = async (days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const types = ['PAGE_VIEW', 'BLOG_VIEW', 'DOC_VIEW', 'SEARCH', 'CONTACT'];
  const events = await Promise.all(
    types.map(async (type) => ({
      type,
      count: await prisma.analyticsEvent.count({ where: { type, createdAt: { gte: since } } }),
    }))
  );

  return { events };
};

module.exports = {
  logEvent,
  getOverview,
  getProductAnalytics,
  getDownloadAnalytics,
  getUserAnalytics,
  getSupportAnalytics,
  getWebsiteAnalytics,
};
