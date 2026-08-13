const analyticsService = require('../services/analytics.service');
const { sendSuccess } = require('../utils/response');

const overview = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const data = await analyticsService.getOverview(days);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const products = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const data = await analyticsService.getProductAnalytics(days);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const downloads = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const data = await analyticsService.getDownloadAnalytics(days);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const users = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const data = await analyticsService.getUserAnalytics(days);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const support = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const data = await analyticsService.getSupportAnalytics(days);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const website = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const data = await analyticsService.getWebsiteAnalytics(days);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = { overview, products, downloads, users, support, website };
