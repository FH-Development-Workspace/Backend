const { Router } = require('express');
const systemController = require('../controllers/system.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');

const router = Router();

router.get('/health', systemController.health);
router.get('/status', systemController.getStatus);
router.get('/activity', authenticate, requirePermission('AUDIT_VIEW'), systemController.getActivity);
router.get('/settings', authenticate, requirePermission('SYSTEM_SETTINGS'), systemController.getSettings);
router.put('/settings/:key', authenticate, requirePermission('SYSTEM_SETTINGS'), systemController.updateSetting);

module.exports = router;
