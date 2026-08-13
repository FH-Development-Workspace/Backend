const healthService = require('../services/health.service');
const auditService = require('../services/audit.service');
const prisma = require('../config/database');
const { sendSuccess } = require('../utils/response');

const health = async (req, res, next) => {
  try {
    const detailed = req.query.detailed === 'true';
    const data = detailed
      ? await healthService.getDetailedHealth()
      : healthService.getBasicHealth();

    const statusCode = data.status === 'DOWN' ? 503 : 200;
    sendSuccess(res, data, 'Health check', statusCode);
  } catch (err) {
    next(err);
  }
};

const getStatus = async (req, res, next) => {
  try {
    const data = await healthService.getDetailedHealth();
    const statusCode = data.status === 'DOWN' ? 503 : 200;
    sendSuccess(res, data, 'System status', statusCode);
  } catch (err) {
    next(err);
  }
};

const getActivity = async (req, res, next) => {
  try {
    const logs = await auditService.getLogs({ skip: 0, limit: 20 });
    sendSuccess(res, { activity: logs.items });
  } catch (err) {
    next(err);
  }
};

const getSettings = async (req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    sendSuccess(res, { settings: settingsMap });
  } catch (err) {
    next(err);
  }
};

const updateSetting = async (req, res, next) => {
  try {
    const setting = await prisma.systemSetting.upsert({
      where: { key: req.params.key },
      create: { key: req.params.key, value: req.body.value, type: req.body.type || 'string' },
      update: { value: req.body.value },
    });
    sendSuccess(res, { setting }, 'Setting updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { health, getStatus, getActivity, getSettings, updateSetting };
