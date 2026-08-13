const { Router } = require('express');
const permissionsController = require('../controllers/permissions.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');

const router = Router();

router.use(authenticate, requirePermission('PERMISSION_VIEW'));

router.get('/', permissionsController.list);
router.post('/', requirePermission('PERMISSION_CREATE'), permissionsController.create);

module.exports = router;
