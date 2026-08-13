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
        apiPrefix: '/api/v1',
        docs: '/api/docs',
        health: '/health',
      },
    });
  });

  app.get('/health', systemController.health);
  app.get('/heath', systemController.health);
  app.get('/api/v1/health', systemController.health);
};

module.exports = { registerHealthRoutes };
