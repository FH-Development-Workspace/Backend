const helmet = require('helmet');
const cors = require('cors');
const env = require('../config/environment');

const securityMiddleware = [
  helmet(),
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.allowedOrigins.includes(origin)) return callback(null, true);
      if (env.isProduction && origin.endsWith('.onrender.com')) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
];

module.exports = securityMiddleware;
