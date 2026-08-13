const { Router } = require('express');
const rolesController = require('../controllers/roles.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');

const router = Router();

router.use(authenticate, requirePermission('ROLE_VIEW'));

router.get('/', rolesController.listRoles);
router.post('/', requirePermission('ROLE_CREATE'), rolesController.createRole);
router.patch('/:id', requirePermission('ROLE_EDIT'), rolesController.updateRole);
router.put('/:id/permissions', requirePermission('ROLE_EDIT'), rolesController.assignPermissions);

module.exports = router;
