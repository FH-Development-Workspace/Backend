const auditService = require('../services/audit.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { items, total } = await auditService.getLogs({
      skip,
      limit,
      page,
      action: req.query.action,
      resource: req.query.resource,
      actorId: req.query.actorId,
      from: req.query.from,
      to: req.query.to,
    });
    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

module.exports = { list };
