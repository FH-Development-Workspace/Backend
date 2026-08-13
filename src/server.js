require('dotenv').config();

const app = require('./app');
const env = require('./config/environment');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const logger = require('./utils/logger');

const start = async () => {
  const connected = await connectDatabase();
  if (connected) {
    logger.info('Database connected');
  } else {
    logger.error('Database connection failed — check DATABASE_URL');
    if (env.isProduction) {
      logger.warn('Starting without database — health check will report DOWN');
    }
  }

  const host = env.isProduction ? '0.0.0.0' : undefined;

  const server = app.listen(env.port, host, () => {
    logger.info(`FH Development API listening on port ${env.port}`, {
      environment: env.nodeEnv,
      host: host || 'localhost',
      apiPrefix: '/api/v1',
      health: ['/health', '/heath', '/api/v1/health'],
      apiUrl: env.apiBaseUrl,
    });
  });

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: reason?.message || reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { message: err.message, stack: err.stack });
    if (env.isProduction) process.exit(1);
  });

  return server;
};

start().catch((err) => {
  logger.error('Failed to start server', { message: err.message });
  process.exit(1);
});

module.exports = app;
