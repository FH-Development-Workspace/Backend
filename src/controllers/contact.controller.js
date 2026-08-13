const prisma = require('../config/database');
const emailService = require('../services/email.service');
const analyticsService = require('../services/analytics.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const submit = async (req, res, next) => {
  try {
    const message = await prisma.contactMessage.create({
      data: { ...req.body, ipAddress: req.ip },
    });

    await emailService.sendTemplate(process.env.SMTP_FROM || 'admin@fh-development.xyz', 'contactNotification', req.body);

    await analyticsService.logEvent('CONTACT', {
      resource: 'contact',
      resourceId: message.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { id: message.id }, 'Message received', 201);
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = {};
    if (req.query.status) where.status = req.query.status;

    const [items, total] = await Promise.all([
      prisma.contactMessage.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.contactMessage.count({ where }),
    ]);

    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const message = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    sendSuccess(res, { message }, 'Status updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { submit, list, updateStatus };
