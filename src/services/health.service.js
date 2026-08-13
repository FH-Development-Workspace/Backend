const prisma = require('../config/database');
const env = require('../config/environment');
const storageService = require('./storage.service');

const withTimeout = (promise, ms = 5000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), ms)),
  ]);

const checkDatabase = async () => {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`);
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
  const database = await checkDatabase();
  const storageChecks = checkStorage();

  const services = {
    api: 'OPERATIONAL',
    database,
    authentication: 'OPERATIONAL',
    email: env.smtp.host ? 'OPERATIONAL' : 'DEGRADED',
    vault: env.vault.enabled ? 'CONFIGURED' : 'NOT_CONFIGURED',
    ...storageChecks,
  };

  const values = Object.values(services).filter((v) => v !== 'NOT_CONFIGURED');
  const status = values.includes('DOWN') ? 'DOWN' : values.includes('DEGRADED') ? 'DEGRADED' : 'OPERATIONAL';

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
