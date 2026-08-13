const env = require('./environment');

module.exports = {
  provider: env.storage.provider,
  endpoint: env.storage.endpoint,
  bucket: env.storage.bucket,
  accessKey: env.storage.accessKey,
  secretKey: env.storage.secretKey,
  region: env.storage.region,
  useLocal: env.storage.useLocal,
  localPath: env.storage.localPath,
  cloudinaryEnabled: env.cloudinary.enabled,
};
