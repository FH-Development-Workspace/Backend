const { query } = require('../config/database');
const healthService = require('../services/health.service');
const auditService = require('../services/audit.service');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const health = async (req, res, next) => {
  try {
    const isDetailed = req.query.detailed === 'true';
    const data = isDetailed ? await healthService.getDetailedHealth() : healthService.getBasicHealth();
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const getStatus = async (req, res, next) => {
  try {
    const data = await healthService.getDetailedHealth();
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const getActivity = async (req, res, next) => {
  try {
    const logs = await auditService.getLogs({ limit: 20 });
    sendSuccess(res, logs);
  } catch (err) {
    next(err);
  }
};

const getSettings = async (req, res, next) => {
  try {
    const resSettings = await query('SELECT key, value FROM system_settings');
    const settingsMap = {};
    for (const row of resSettings.rows) {
      settingsMap[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    }
    sendSuccess(res, { settings: settingsMap });
  } catch (err) {
    next(err);
  }
};

const updateSetting = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    const itemKey = req.params.key || key;
    if (!itemKey) throw new AppError('key is required', 400, 'BAD_REQUEST');

    const resSet = await query(`
      INSERT INTO system_settings (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW()
      RETURNING *
    `, [itemKey, JSON.stringify(value)]);

    sendSuccess(res, { setting: resSet.rows[0] }, 'Setting saved');
  } catch (err) {
    next(err);
  }
};

module.exports = { health, getStatus, getActivity, getSettings, updateSetting };
