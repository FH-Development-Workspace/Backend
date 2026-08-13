const { Router } = require('express');
const blogController = require('../controllers/blog.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createBlogPostSchema, updateBlogPostSchema } = require('../validators/content.validator');

const router = Router();

router.get('/', optionalAuth, blogController.list);
router.get('/:slug', optionalAuth, blogController.getBySlug);
router.post('/', authenticate, requirePermission('BLOG_CREATE'), validate(createBlogPostSchema), blogController.create);
router.patch('/:id', authenticate, requirePermission('BLOG_EDIT'), validate(updateBlogPostSchema), blogController.update);
router.post('/:id/publish', authenticate, requirePermission('BLOG_PUBLISH'), blogController.publish);
router.post('/:id/unpublish', authenticate, requirePermission('BLOG_PUBLISH'), blogController.unpublish);
router.delete('/:id', authenticate, requirePermission('BLOG_DELETE'), blogController.remove);

module.exports = router;
