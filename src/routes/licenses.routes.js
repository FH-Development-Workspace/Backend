const { Router } = require('express');
const licensesController = require('../controllers/licenses.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
  createLicenseSchema, activateLicenseSchema, deactivateLicenseSchema, renewLicenseSchema,
} = require('../validators/license.validator');

const router = Router();

router.post('/activate', authenticate, validate(activateLicenseSchema), licensesController.activate);
router.post('/deactivate', authenticate, validate(deactivateLicenseSchema), licensesController.deactivate);

router.use(authenticate);

router.get('/', requirePermission('LICENSE_VIEW'), licensesController.list);
router.post('/', requirePermission('LICENSE_CREATE'), validate(createLicenseSchema), licensesController.create);
router.get('/:id', requirePermission('LICENSE_VIEW'), licensesController.getById);
router.post('/:id/revoke', requirePermission('LICENSE_REVOKE'), licensesController.revoke);
router.post('/:id/renew', requirePermission('LICENSE_EDIT'), validate(renewLicenseSchema), licensesController.renew);
router.delete('/:id', requirePermission('LICENSE_DELETE'), licensesController.softDelete);

module.exports = router;
