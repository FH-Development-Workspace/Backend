const { Router } = require('express');
const docsController = require('../controllers/documentation.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createDocArticleSchema } = require('../validators/content.validator');

const router = Router();

router.get('/categories', optionalAuth, docsController.listCategories);
router.get('/', optionalAuth, docsController.listArticles);
router.get('/:slug', optionalAuth, docsController.getBySlug);
router.post('/', authenticate, requirePermission('DOC_CREATE'), validate(createDocArticleSchema), docsController.create);
router.patch('/:id', authenticate, requirePermission('DOC_EDIT'), docsController.update);
router.delete('/:id', authenticate, requirePermission('DOC_DELETE'), docsController.remove);

module.exports = router;
