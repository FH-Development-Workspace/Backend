const helmet = require('helmet');
const cors = require('cors');
const env = require('../config/environment');

const ALLOWED_ORIGINS = [
  'https://fh-development.xyz',
  'https://www.fh-development.xyz',
  'https://fh-development-workspace.github.io',
  'https://fh-development-workspace.github.io/Frontend',
  'https://fh-development-workspace.github.io/Dashboards',
  'https://fh-development-workspace.github.io/Legal_Website',
  'https://dashboard.fh-development.xyz',
  'https://dashboard.fh-developments.xyz',
  'https://admin-dashboard.fh-development.xyz',
  'https://staff-dashboard.fh-development.xyz',
  'https://client-dashboard.fh-development.xyz',
  'https://legal.fh-development.xyz',
  'https://status.fh-development.xyz',
  'https://docs.fh-development.xyz',
  'https://backend.fh-development.xyz',
  'https://api.fh-development.xyz',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const clean = origin.trim().replace(/\/$/, '').toLowerCase();
  if (ALLOWED_ORIGINS.some(o => o.toLowerCase() === clean)) return true;
  if (clean.endsWith('.fh-development.xyz') || clean.endsWith('.fh-developments.xyz')) return true;
  if (clean.includes('github.io')) return true;
  if (clean.includes('localhost') || clean.includes('127.0.0.1')) return true;
  return false;
};

const securityMiddleware = [
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }),
  cors({
    origin: (origin, callback) => {
      // Always allow valid client origins, and gracefully permit in all modes
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400,
  }),
];

module.exports = securityMiddleware;
