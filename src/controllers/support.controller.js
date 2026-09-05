const { query, transaction } = require('../config/database');
const emailService = require('../services/email.service');
const notificationService = require('../services/notification.service');
const auditService = require('../services/audit.service');
const analyticsService = require('../services/analytics.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    let whereClauses = [];
    let params = [];

    const canViewAll = req.userPermissions?.includes('SUPPORT_VIEW');
    if (!canViewAll) {
      params.push(req.user.id);
      whereClauses.push(`st.user_id = $${params.length}`);
    } else {
      if (req.query.status) {
        params.push(req.query.status);
        whereClauses.push(`st.status = $${params.length}`);
      }
      if (req.query.priority) {
        params.push(req.query.priority);
        whereClauses.push(`st.priority = $${params.length}`);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM support_tickets st ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const listParams = [...params, limit, skip];
    const itemsRes = await query(`
      SELECT st.*, u.username as "userUsername", u.email as "userEmail",
             COUNT(tm.id) as "messageCount"
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN ticket_messages tm ON tm.ticket_id = st.id
      ${whereSql}
      GROUP BY st.id, u.id
      ORDER BY st.updated_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, listParams);

    sendPaginated(res, itemsRes.rows, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const ticketRes = await query(`
      SELECT st.*, u.username as "userUsername", u.email as "userEmail"
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      WHERE st.id = $1
    `, [req.params.id]);

    if (!ticketRes.rows.length) throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    const ticket = ticketRes.rows[0];

    const canViewAll = req.userPermissions?.includes('SUPPORT_VIEW');
    if (!canViewAll && ticket.user_id !== req.user.id) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const msgWhere = canViewAll ? 'WHERE ticket_id = $1' : 'WHERE ticket_id = $1 AND is_internal = false';
    const messagesRes = await query(`
      SELECT tm.*, u.username as "senderUsername"
      FROM ticket_messages tm
      JOIN users u ON tm.sender_id = u.id
      ${msgWhere}
      ORDER BY tm.created_at ASC
    `, [ticket.id]);

    ticket.messages = messagesRes.rows;
    sendSuccess(res, { ticket });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { subject, category, priority, message } = req.body;
    const userId = req.user.id;

    if (!subject || !message) {
      throw new AppError('Subject and message are required', 400, 'BAD_REQUEST');
    }

    const ticket = await transaction(async (client) => {
      const tRes = await client.query(`
        INSERT INTO support_tickets (user_id, subject, category, priority, status)
        VALUES ($1, $2, COALESCE($3, 'GENERAL'), COALESCE($4, 'NORMAL'), 'OPEN')
        RETURNING *
      `, [userId, subject, category, priority]);

      const t = tRes.rows[0];

      await client.query(`
        INSERT INTO ticket_messages (ticket_id, sender_id, message, is_internal)
        VALUES ($1, $2, $3, false)
      `, [t.id, userId, message]);

      return t;
    });

    await emailService.sendTemplate(req.user.email, 'supportTicketCreated', {
      name: req.user.username,
      ticketNumber: ticket.ticket_number,
    });

    await notificationService.create(userId, {
      type: 'SUPPORT',
      title: 'Support Ticket Created',
      message: `Your ticket #${ticket.ticket_number} has been created.`,
      link: '/client-dashboard/tickets.html',
    });

    sendSuccess(res, { ticket }, 'Ticket created', 201);
  } catch (err) {
    next(err);
  }
};

const reply = async (req, res, next) => {
  try {
    const ticketRes = await query('SELECT * FROM support_tickets WHERE id = $1', [req.params.id]);
    if (!ticketRes.rows.length) throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    const ticket = ticketRes.rows[0];

    const isStaff = req.userPermissions?.includes('SUPPORT_REPLY');
    if (!isStaff && ticket.user_id !== req.user.id) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const isInternal = isStaff && Boolean(req.body.isInternal);
    const messageText = req.body.message || req.body.content;

    const msgRes = await query(`
      INSERT INTO ticket_messages (ticket_id, sender_id, message, is_internal)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [ticket.id, req.user.id, messageText, isInternal]);

    const newStatus = isStaff ? 'WAITING_FOR_USER' : 'IN_PROGRESS';
    await query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', [newStatus, ticket.id]);

    if (!isInternal && isStaff) {
      await notificationService.create(ticket.user_id, {
        type: 'SUPPORT',
        title: 'New Support Reply',
        message: `Staff replied to your ticket #${ticket.ticket_number}.`,
        link: '/client-dashboard/tickets.html',
      });
    }

    sendSuccess(res, { message: msgRes.rows[0] }, 'Reply added');
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { status, priority, assignedTo } = req.body;
    const resUpdate = await query(`
      UPDATE support_tickets
      SET status = COALESCE($1, status),
          priority = COALESCE($2, priority),
          assigned_to = COALESCE($3, assigned_to),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, priority, assignedTo, req.params.id]);

    if (!resUpdate.rows.length) throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    sendSuccess(res, { ticket: resUpdate.rows[0] }, 'Ticket updated');
  } catch (err) {
    next(err);
  }
};

const assign = async (req, res, next) => {
  try {
    const { assigneeId } = req.body;
    const resUpdate = await query(`
      UPDATE support_tickets
      SET assigned_to = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [assigneeId, req.params.id]);

    if (!resUpdate.rows.length) throw new AppError('Ticket not found', 404, 'NOT_FOUND');

    await auditService.log({
      actorId: req.user.id,
      action: 'SUPPORT_ASSIGNED',
      resource: 'support_ticket',
      resourceId: req.params.id,
      details: { assigneeId },
      ipAddress: req.ip,
    });

    sendSuccess(res, { ticket: resUpdate.rows[0] }, 'Ticket assigned');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, reply, update, assign };
