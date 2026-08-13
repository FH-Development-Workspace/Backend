const downloadService = require('../services/download.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { hasPermission } = require('../utils/permissions');

const getProductDownloads = async (req, res, next) => {
  try {
    const downloads = await downloadService.getProductDownloads(req.params.slug);
    sendSuccess(res, { downloads });
  } catch (err) {
    next(err);
  }
};

const requestDownload = async (req, res, next) => {
  try {
    const result = await downloadService.requestDownload(req.user.id, req.params.fileId, req);
    sendSuccess(res, result, 'Download ready');
  } catch (err) {
    next(err);
  }
};

const getReceipt = async (req, res, next) => {
  try {
    const isStaff = hasPermission(req.userPermissions, 'DOWNLOAD_VIEW');
    const receipt = await downloadService.getReceipt(req.params.id, req.user.id, isStaff);
    sendSuccess(res, { receipt });
  } catch (err) {
    next(err);
  }
};

const getMyDownloads = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { items, total } = await downloadService.getUserDownloads(req.user.id, { skip, limit });
    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

module.exports = { getProductDownloads, requestDownload, getReceipt, getMyDownloads };
