const env = require('./environment');

module.exports = {
  baseUrl: env.vault.baseUrl,
  developerKey: env.vault.developerKey,
  enabled: env.vault.enabled,
};
