const { Router } = require('express');
const servicesController = require('../controllers/services.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');

const router = Router();

router.get('/', optionalAuth, servicesController.list);
router.get('/:slug', optionalAuth, servicesController.getBySlug);
router.post('/', authenticate, requirePermission('SERVICE_CREATE'), servicesController.create);
router.patch('/:id', authenticate, requirePermission('SERVICE_EDIT'), servicesController.update);
router.delete('/:id', authenticate, requirePermission('SERVICE_DELETE'), servicesController.remove);

module.exports = router;
