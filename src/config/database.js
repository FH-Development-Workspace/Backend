const { Pool } = require('pg');
const env = require('./environment');
const logger = require('../utils/logger');

const sslConfig = (() => {
  if (!env.databaseUrl) return false;
  if (env.databaseUrl.includes('sslmode=disable')) return false;
  // Neon and other cloud providers require SSL
  if (env.databaseUrl.includes('neon.tech') ||
      env.databaseUrl.includes('render.com') ||
      env.databaseUrl.includes('supabase') ||
      env.databaseUrl.includes('sslmode=require') ||
      env.databaseUrl.includes('sslmode=verify-full') ||
      env.isProduction) {
    return { rejectUnauthorized: false };
  }
  return false;
})();

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: sslConfig,
  max: 10,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  statement_timeout: 60000,
  query_timeout: 60000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: false,
});

pool.on('error', (err) => {
  logger.error('PostgreSQL pool error', { message: err.message });
});

pool.on('connect', () => {
  if (env.isDevelopment) logger.debug('New PostgreSQL client connected');
});

const connectDatabase = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('Database connected');
    return true;
  } catch (err) {
    logger.error('Database connection failed', { message: err.message });
    return false;
  }
};

const disconnectDatabase = async () => {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (err) {
    logger.error('Error closing database pool', { message: err.message });
  }
};

/**
 * Execute a parameterized query with automatic retry on ETIMEDOUT.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @param {number} retries - Number of retries on connection errors
 */
const query = async (text, params, retries = 1) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    if (env.isDevelopment) {
      logger.debug('DB query', {
        text: text.substring(0, 80).replace(/\s+/g, ' ').trim(),
        duration: Date.now() - start,
        rows: result.rowCount,
      });
    }
    return result;
  } catch (err) {
    const isConnectionError = err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' ||
      err.code === 'ECONNREFUSED' || err.message?.includes('Connection terminated') ||
      err.message?.includes('connect ETIMEDOUT');

    if (isConnectionError && retries > 0) {
      logger.warn('DB query connection error, retrying...', { message: err.message, retriesLeft: retries });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return query(text, params, retries - 1);
    }

    logger.error('DB query error', {
      text: text.substring(0, 80).replace(/\s+/g, ' ').trim(),
      message: err.message,
    });
    throw err;
  }
};

/**
 * Execute multiple queries in a transaction.
 * @param {Function} callback - async fn(client) => result
 */
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, transaction, connectDatabase, disconnectDatabase };
