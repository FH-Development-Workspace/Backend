require('dotenv').config();

const DEFAULT_ORIGINS = [
  'https://fh-development.xyz',
  'https://www.fh-development.xyz',
  'https://dashboard.fh-development.xyz',
  'https://backend-mczn.onrender.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const isRender = process.env.RENDER === 'true';
const renderExternalUrl = process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, '') || null;

const nodeEnv = process.env.NODE_ENV || (isRender ? 'production' : 'development');

const parseOrigins = () => {
  const fromEnv = (process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(','))
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const origins = new Set(fromEnv);

  if (renderExternalUrl) origins.add(renderExternalUrl);

  return [...origins];
};

const resolveApiBaseUrl = () => {
  if (process.env.API_BASE_URL) return process.env.API_BASE_URL.replace(/\/$/, '');
  if (renderExternalUrl) return renderExternalUrl;
  return 'http://localhost:5000';
};

const env = {
  nodeEnv,
  port: parseInt(process.env.PORT, 10) || 5000,
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv !== 'production' && nodeEnv !== 'test',
  isTest: nodeEnv === 'test',
  isRender,

  databaseUrl: process.env.DATABASE_URL,
  directDatabaseUrl: process.env.DIRECT_URL,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3001',
  apiBaseUrl: resolveApiBaseUrl(),
  renderUrl: renderExternalUrl,

  allowedOrigins: parseOrigins(),

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'no-reply@fh-development.xyz',
    fromName: process.env.SMTP_FROM_NAME || 'FH Developments',
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    endpoint: process.env.STORAGE_ENDPOINT,
    bucket: process.env.STORAGE_BUCKET || 'fh-development',
    accessKey: process.env.STORAGE_ACCESS_KEY,
    secretKey: process.env.STORAGE_SECRET_KEY,
    region: process.env.STORAGE_REGION || 'us-east-1',
    useLocal: process.env.STORAGE_USE_LOCAL === 'true' || process.env.STORAGE_PROVIDER === 'local',
    localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
  },

  cloudinary: {
    url: process.env.CLOUDINARY_URL,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'fh-development',
    enabled: process.env.STORAGE_PROVIDER === 'cloudinary' || !!process.env.CLOUDINARY_URL,
  },

  vault: {
    baseUrl: process.env.VAULT_API_BASE_URL || 'https://api.vaultroblox.com',
    developerKey: process.env.VAULT_DEVELOPER_KEY,
    enabled: process.env.VAULT_ENABLED === 'true' && !!process.env.VAULT_DEVELOPER_KEY,
  },

  hosting: {
    paymentLinks: {
      starter: process.env.STRIPE_HOSTING_STARTER_PAYMENT_LINK,
      standard: process.env.STRIPE_HOSTING_STANDARD_PAYMENT_LINK,
      premium: process.env.STRIPE_HOSTING_PREMIUM_PAYMENT_LINK,
    },
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL,
    adminPassword: process.env.SEED_ADMIN_PASSWORD,
    adminUsername: process.env.SEED_ADMIN_USERNAME || 'admin',
  },
};

const required = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'API_BASE_URL',
  'FRONTEND_URL',
  'ALLOWED_ORIGINS',
];
if (env.isProduction) {
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  if (env.cloudinary.enabled) {
    for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
      if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  if (process.env.VAULT_ENABLED === 'true') {
    for (const key of ['VAULT_API_BASE_URL', 'VAULT_DEVELOPER_KEY']) {
      if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

module.exports = env;
