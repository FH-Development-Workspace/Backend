const systemController = require('./controllers/system.controller');
const env = require('./config/environment');

const registerHealthRoutes = (app) => {
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'FH Development API',
      data: {
        name: 'fh-development-api',
        version: '1.0.0',
        environment: env.nodeEnv,
        apiUrl: env.apiBaseUrl,
        renderUrl: env.renderUrl,
        apiPrefix: '/api/v1',
        docs: `${env.apiBaseUrl}/api/docs`,
        health: `${env.apiBaseUrl}/health`,
        endpoints: {
          products: `${env.apiBaseUrl}/api/v1/products`,
          auth: `${env.apiBaseUrl}/api/v1/auth`,
          search: `${env.apiBaseUrl}/api/v1/search`,
        },
      },
    });
  });

  app.get('/health', systemController.health);
  app.get('/heath', systemController.health);
  app.get('/api/v1/health', systemController.health);
};

module.exports = { registerHealthRoutes };
