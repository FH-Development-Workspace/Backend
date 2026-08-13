require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test',
  isTest: process.env.NODE_ENV === 'test',

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
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000',

  allowedOrigins: (process.env.ALLOWED_ORIGINS
    || 'https://fh-development.xyz,https://www.fh-development.xyz,https://dashboard.fh-development.xyz,http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

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

  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL,
    adminPassword: process.env.SEED_ADMIN_PASSWORD,
    adminUsername: process.env.SEED_ADMIN_USERNAME || 'admin',
  },
};

const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
if (env.isProduction) {
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

module.exports = env;
