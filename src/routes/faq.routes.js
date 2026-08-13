const { Router } = require('express');
const faqController = require('../controllers/faq.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createFaqSchema } = require('../validators/content.validator');

const router = Router();

router.get('/categories', optionalAuth, faqController.listCategories);
router.get('/', optionalAuth, faqController.list);
router.post('/', authenticate, requirePermission('FAQ_CREATE'), validate(createFaqSchema), faqController.create);
router.patch('/:id', authenticate, requirePermission('FAQ_EDIT'), faqController.update);
router.delete('/:id', authenticate, requirePermission('FAQ_DELETE'), faqController.remove);

module.exports = router;
