const notificationService = require('../services/notification.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const list = async (req, res, next) => {
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

const markRead = async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    sendSuccess(res, null, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, markRead, markAllRead };
