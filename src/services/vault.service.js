const vaultConfig = require('../config/vault');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/error.middleware');

const buildHeaders = () => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Authorization: `Bearer ${vaultConfig.developerKey}`,
  'X-Vault-Developer-Key': vaultConfig.developerKey,
});

const request = async (method, path, body = null) => {
  if (!vaultConfig.enabled) {
    throw new AppError('Vault integration is not configured', 503, 'VAULT_NOT_CONFIGURED');
  }

  const url = `${vaultConfig.baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

  const options = {
    method,
    headers: buildHeaders(),
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    logger.warn('Vault API error', { url, status: response.status, data });
    throw new AppError(
      data?.message || data?.error || 'Vault API request failed',
      response.status >= 400 && response.status < 600 ? response.status : 502,
      'VAULT_API_ERROR',
      { status: response.status, path }
    );
  }

  return data;
};

const getStatus = async () => {
  if (!vaultConfig.enabled) {
    return { enabled: false, status: 'NOT_CONFIGURED' };
  }

  return {
    enabled: true,
    status: 'CONFIGURED',
    baseUrl: vaultConfig.baseUrl,
  };
};

const ping = async () => {
  if (!vaultConfig.enabled) {
    throw new AppError('Vault integration is not configured', 503, 'VAULT_NOT_CONFIGURED');
  }

  try {
    const data = await request('GET', '/v1/me');
    return { enabled: true, status: 'CONNECTED', profile: data };
  } catch (err) {
    try {
      await request('GET', '/');
      return { enabled: true, status: 'REACHABLE', message: 'API reachable; verify key permissions' };
    } catch {
      return { enabled: true, status: 'DEGRADED', message: err.message };
    }
  }
};

const listProducts = async (query = {}) => {
  const params = new URLSearchParams(query).toString();
  const path = params ? `/v1/products?${params}` : '/v1/products';
  return request('GET', path);
};

const getProduct = async (productId) => request('GET', `/v1/products/${productId}`);

const listVaults = async () => request('GET', '/v1/vaults');

const getVault = async (vaultId) => request('GET', `/v1/vaults/${vaultId}`);

module.exports = {
  request,
  getStatus,
  ping,
  listProducts,
  getProduct,
  listVaults,
  getVault,
};
