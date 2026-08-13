const { Router } = require('express');
const roadmapController = require('../controllers/roadmap.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createRoadmapItemSchema } = require('../validators/company.validator');

const router = Router();

router.get('/', optionalAuth, roadmapController.list);
router.post('/', authenticate, requirePermission('ROADMAP_CREATE'), validate(createRoadmapItemSchema), roadmapController.create);
router.patch('/:id', authenticate, requirePermission('ROADMAP_EDIT'), roadmapController.update);
router.delete('/:id', authenticate, requirePermission('ROADMAP_DELETE'), roadmapController.remove);

module.exports = router;
