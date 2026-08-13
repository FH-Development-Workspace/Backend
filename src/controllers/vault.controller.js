const vaultService = require('../services/vault.service');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const status = async (req, res, next) => {
  try {
    const data = await vaultService.ping();
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const listProducts = async (req, res, next) => {
  try {
    const data = await vaultService.listProducts(req.query);
    sendSuccess(res, { products: data });
  } catch (err) {
    next(err);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const data = await vaultService.getProduct(req.params.id);
    sendSuccess(res, { product: data });
  } catch (err) {
    next(err);
  }
};

const listVaults = async (req, res, next) => {
  try {
    const data = await vaultService.listVaults();
    sendSuccess(res, { vaults: data });
  } catch (err) {
    next(err);
  }
};

const getVault = async (req, res, next) => {
  try {
    const data = await vaultService.getVault(req.params.id);
    sendSuccess(res, { vault: data });
  } catch (err) {
    next(err);
  }
};

const proxy = async (req, res, next) => {
  try {
    const path = req.query.path || req.body?.path;
    if (!path) {
      throw new AppError('Vault proxy path is required', 400, 'VALIDATION_ERROR');
    }
    const data = await vaultService.request(req.method, path.startsWith('/') ? path : `/${path}`, req.body);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = { status, listProducts, getProduct, listVaults, getVault, proxy };
