const crypto = require('crypto');
const prisma = require('../config/database');
const emailService = require('../services/email.service');
const notificationService = require('../services/notification.service');
const auditService = require('../services/audit.service');
const analyticsService = require('../services/analytics.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const generateTicketNumber = () => `TKT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { deletedAt: null };

    const canViewAll = req.userPermissions?.includes('SUPPORT_VIEW');
    if (!canViewAll) {
      where.userId = req.user.id;
    } else {
      if (req.query.status) where.status = req.query.status;
      if (req.query.priority) where.priority = req.query.priority;
      if (req.query.assignee) {
        where.assignments = { some: { assigneeId: req.query.assignee } };
      }
    }

    const [items, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, email: true } },
          assignments: {
            include: { assignee: { select: { id: true, username: true } } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: { select: { messages: true } },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, username: true, email: true } },
        messages: {
          where: req.userPermissions?.includes('SUPPORT_VIEW') ? {} : { isInternal: false },
          include: { user: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
        assignments: { include: { assignee: { select: { id: true, username: true } } } },
      },
    });

    if (!ticket) throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    if (!req.userPermissions?.includes('SUPPORT_VIEW') && ticket.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    sendSuccess(res, { ticket });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const ticketNumber = generateTicketNumber();
    const { message, ...ticketData } = req.body;

    const ticket = await prisma.supportTicket.create({
      data: {
        ...ticketData,
        ticketNumber,
        userId: req.user.id,
        messages: { create: { userId: req.user.id, content: message } },
      },
      include: { messages: true },
    });

    await emailService.sendTemplate(req.user.email, 'supportTicketCreated', {
      name: req.user.username,
      ticketNumber,
    });

    await notificationService.create(req.user.id, {
      type: 'SUPPORT',
      title: 'Support Ticket Created',
      message: `Your ticket ${ticketNumber} has been created.`,
      data: { ticketId: ticket.id },
    });

    await analyticsService.logEvent('SUPPORT', {
      userId: req.user.id,
      resource: 'support_ticket',
      resourceId: ticket.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { ticket }, 'Ticket created', 201);
  } catch (err) {
    next(err);
  }
};

const reply = async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
    if (!ticket) throw new AppError('Ticket not found', 404, 'NOT_FOUND');

    const isStaff = req.userPermissions?.includes('SUPPORT_REPLY');
    if (!isStaff && ticket.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const isInternal = isStaff && req.body.isInternal;

    const message = await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        userId: req.user.id,
        content: req.body.content,
        isInternal: isInternal || false,
      },
    });

    const updateData = { updatedAt: new Date() };
    if (isStaff) updateData.status = 'IN_PROGRESS';
    else updateData.status = 'WAITING_FOR_USER';

    await prisma.supportTicket.update({ where: { id: ticket.id }, data: updateData });

    if (!isInternal) {
      const notifyUserId = isStaff ? ticket.userId : null;
      if (notifyUserId) {
        await emailService.sendTemplate(
          (await prisma.user.findUnique({ where: { id: ticket.userId } })).email,
          'supportReply',
          { name: '', ticketNumber: ticket.ticketNumber }
        );
      }
    }

    sendSuccess(res, { message }, 'Reply added');
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.status === 'RESOLVED') data.resolvedAt = new Date();
    if (data.status === 'CLOSED') data.closedAt = new Date();

    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data,
    });
    sendSuccess(res, { ticket }, 'Ticket updated');
  } catch (err) {
    next(err);
  }
};

const assign = async (req, res, next) => {
  try {
    const assignment = await prisma.supportAssignment.create({
      data: {
        ticketId: req.params.id,
        assigneeId: req.body.assigneeId,
        assignedBy: req.user.id,
        notes: req.body.notes,
      },
    });

    await auditService.log({
      actorId: req.user.id,
      action: 'SUPPORT_ASSIGNED',
      resource: 'support_ticket',
      resourceId: req.params.id,
      metadata: { assigneeId: req.body.assigneeId },
      ipAddress: req.ip,
    });

    sendSuccess(res, { assignment }, 'Ticket assigned');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, reply, update, assign };
