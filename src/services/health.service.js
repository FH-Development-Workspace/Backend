const { query } = require('../config/database');
const env = require('../config/environment');
const storageService = require('./storage.service');

const withTimeout = (promise, ms = 5000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), ms)),
  ]);

const checkDatabase = async () => {
  try {
    await withTimeout(query('SELECT 1'));
    return 'OPERATIONAL';
  } catch {
    return 'DOWN';
  }
};

const checkStorage = () => {
  if (storageService.isCloudinary()) return { storage: 'OPERATIONAL', cloudinary: 'OPERATIONAL' };
  if (env.storage.useLocal) return { storage: 'OPERATIONAL' };
  if (env.storage.endpoint) return { storage: 'OPERATIONAL' };
  return { storage: 'DEGRADED' };
};

const checkHosting = async () => {
  try {
    const res = await withTimeout(query("SELECT COUNT(*) FROM hosting_plans WHERE active = true"), 1500);
    const activePlans = parseInt(res.rows[0].count, 10);
    return activePlans > 0 ? 'OPERATIONAL' : 'DEGRADED';
  } catch {
    return 'DOWN';
  }
};

const getBasicHealth = () => ({
  status: 'OPERATIONAL',
  service: 'fh-development-api',
  version: '1.0.0',
  environment: env.nodeEnv,
  timestamp: new Date().toISOString(),
  uptime: Math.floor(process.uptime()),
  apiUrl: env.apiBaseUrl,
});

const getDetailedHealth = async () => {
  const [database, hosting] = await Promise.all([checkDatabase(), checkHosting()]);
  const storageChecks = checkStorage();

  const services = {
    api: 'OPERATIONAL',
    database,
    authentication: 'OPERATIONAL',
    email: env.smtp.host ? 'OPERATIONAL' : 'DEGRADED',
    vault: env.vault.enabled ? 'CONFIGURED' : 'NOT_CONFIGURED',
    roblox: env.vault.enabled ? 'CONFIGURED' : 'NOT_CONFIGURED',
    discord: process.env.DISCORD_BOT_TOKEN ? 'CONFIGURED' : 'NOT_CONFIGURED',
    hosting,
    ...storageChecks,
  };

  const coreValues = [services.api, services.database, services.authentication];
  const optionalValues = Object.entries(services)
    .filter(([name]) => !['api', 'database', 'authentication'].includes(name))
    .map(([, value]) => value)
    .filter((value) => value !== 'NOT_CONFIGURED');
  const status = coreValues.includes('DOWN')
    ? 'DOWN'
    : coreValues.includes('DEGRADED') || optionalValues.includes('DOWN') || optionalValues.includes('DEGRADED')
      ? 'DEGRADED'
      : 'OPERATIONAL';

  return {
    status,
    service: 'fh-development-api',
    version: '1.0.0',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    apiUrl: env.apiBaseUrl,
    frontendUrl: env.frontendUrl,
    services,
  };
};

module.exports = { getBasicHealth, getDetailedHealth, checkDatabase };
