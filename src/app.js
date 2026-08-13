const express = require('express');
const path = require('path');
const compression = require('compression');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const securityMiddleware = require('./middleware/security.middleware');
const { generalLimiter } = require('./middleware/rateLimit.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const apiRoutes = require('./routes');
const { registerHealthRoutes } = require('./health.routes');
const env = require('./config/environment');
const logger = require('./utils/logger');

const app = express();

app.set('trust proxy', 1);

app.use(...securityMiddleware);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

registerHealthRoutes(app);

try {
  const openapiPath = path.join(__dirname, '../docs/openapi.yaml');
  const swaggerDocument = YAML.load(openapiPath);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
  logger.warn('OpenAPI documentation not loaded', { error: err.message });
}

app.use('/api/v1', generalLimiter, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
