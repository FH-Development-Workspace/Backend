const { Router } = require('express');
const applicationsController = require('../controllers/applications.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { updateApplicationSchema } = require('../validators/career.validator');

const router = Router();

router.use(authenticate, requirePermission('APPLICATION_VIEW'));

router.get('/', applicationsController.list);
router.get('/:id', applicationsController.getById);
router.patch('/:id', requirePermission('APPLICATION_EDIT'), validate(updateApplicationSchema), applicationsController.updateStatus);

module.exports = router;
