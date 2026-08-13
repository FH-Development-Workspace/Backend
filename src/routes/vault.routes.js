const { Router } = require('express');
const vaultController = require('../controllers/vault.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');

const router = Router();

router.get('/status', authenticate, requirePermission('PRODUCT_VIEW'), vaultController.status);
router.get('/products', authenticate, requirePermission('PRODUCT_VIEW'), vaultController.listProducts);
router.get('/products/:id', authenticate, requirePermission('PRODUCT_VIEW'), vaultController.getProduct);
router.get('/vaults', authenticate, requirePermission('PRODUCT_VIEW'), vaultController.listVaults);
router.get('/vaults/:id', authenticate, requirePermission('PRODUCT_VIEW'), vaultController.getVault);
router.all('/proxy', authenticate, requirePermission('PRODUCT_VIEW'), vaultController.proxy);

module.exports = router;
