const { Router } = require('express');
const projectsController = require('../controllers/projects.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');

const router = Router();

router.get('/', optionalAuth, projectsController.list);
router.get('/:slug', optionalAuth, projectsController.getBySlug);
router.post('/', authenticate, requirePermission('PROJECT_CREATE'), projectsController.create);
router.patch('/:id', authenticate, requirePermission('PROJECT_EDIT'), projectsController.update);
router.delete('/:id', authenticate, requirePermission('PROJECT_DELETE'), projectsController.remove);

module.exports = router;
