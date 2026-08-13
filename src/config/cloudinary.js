const env = require('./environment');

module.exports = {
  url: env.cloudinary.url,
  cloudName: env.cloudinary.cloudName,
  apiKey: env.cloudinary.apiKey,
  apiSecret: env.cloudinary.apiSecret,
  folder: env.cloudinary.folder,
  enabled: env.cloudinary.enabled,
};
