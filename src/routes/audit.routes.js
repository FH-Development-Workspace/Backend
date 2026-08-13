const { Router } = require('express');
const auditController = require('../controllers/audit.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');

const router = Router();

router.use(authenticate, requirePermission('AUDIT_VIEW'));

router.get('/', auditController.list);

module.exports = router;
