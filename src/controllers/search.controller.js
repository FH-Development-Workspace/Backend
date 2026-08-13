const searchService = require('../services/search.service');
const analyticsService = require('../services/analytics.service');
const { sendSuccess } = require('../utils/response');

const search = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const limit = parseInt(req.query.limit, 10) || 5;
    const results = await searchService.search(q, limit);

    await analyticsService.logEvent('SEARCH', {
      userId: req.user?.id,
      metadata: { query: q },
      ipAddress: req.ip,
    });

    sendSuccess(res, { query: q, results });
  } catch (err) {
    next(err);
  }
};

module.exports = { search };
