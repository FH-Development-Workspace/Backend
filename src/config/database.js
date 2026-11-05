const mysql = require('mysql2/promise');
const env = require('./environment');
const logger = require('../utils/logger');

// Parse MySQL connection string or use individual env vars
const getConnectionConfig = () => {
  if (env.databaseUrl) {
    // Parse connection string: mysql://user:pass@host:port/database
    const match = env.databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (match) {
      return {
        host: match[3],
        port: parseInt(match[4]),
        user: match[1],
        password: match[2],
        database: match[5],
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      };
    }
  }

  // Use individual env vars (no fallbacks - must be configured)
  return {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  };
};

const pool = mysql.createPool(getConnectionConfig());

pool.on('connection', (connection) => {
  if (env.isDevelopment) logger.debug('New MySQL connection established');
});

pool.on('acquire', (connection) => {
  if (env.isDevelopment) logger.debug('Connection acquired from pool');
});

pool.on('release', (connection) => {
  if (env.isDevelopment) logger.debug('Connection released to pool');
});

pool.on('error', (err) => {
  logger.error('MySQL pool error', { message: err.message });
});

const connectDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('MySQL database connected');
    return true;
  } catch (err) {
    logger.error('MySQL database connection failed', { message: err.message });
    return false;
  }
};

const disconnectDatabase = async () => {
  try {
    await pool.end();
    logger.info('MySQL pool closed');
  } catch (err) {
    logger.error('Error closing MySQL pool', { message: err.message });
  }
};

/**
 * Execute a parameterized query with automatic retry on connection errors.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @param {number} retries - Number of retries on connection errors
 */
const query = async (text, params = [], retries = 1) => {
  const start = Date.now();
  try {
    const [rows] = await pool.execute(text, params);
    if (env.isDevelopment) {
      logger.debug('DB query', {
        text: text.substring(0, 80).replace(/\s+/g, ' ').trim(),
        duration: Date.now() - start,
        rows: rows.length,
      });
    }
    return { rows, rowCount: rows.length };
  } catch (err) {
    const isConnectionError = err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' ||
      err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' ||
      err.message?.includes('Connection lost') ||
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
 * @param {Function} callback - async fn(connection) => result
 */
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    try { await connection.rollback(); } catch (_) {}
    throw err;
  } finally {
    connection.release();
  }
};

module.exports = { pool, query, transaction, connectDatabase, disconnectDatabase };
