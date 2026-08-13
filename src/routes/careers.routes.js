const { Router } = require('express');
const careersController = require('../controllers/careers.controller');
const applicationsController = require('../controllers/applications.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createJobSchema, updateJobSchema, applyJobSchema } = require('../validators/career.validator');
const { createUploadMiddleware, ALLOWED_MIMES } = require('../middleware/upload.middleware');

const router = Router();

router.get('/', careersController.list);
router.get('/admin/all', authenticate, requirePermission('CAREER_VIEW'), careersController.listAll);
router.get('/:slug', careersController.getBySlug);
router.post('/', authenticate, requirePermission('CAREER_CREATE'), validate(createJobSchema), careersController.create);
router.patch('/:id', authenticate, requirePermission('CAREER_EDIT'), validate(updateJobSchema), careersController.update);
router.delete('/:id', authenticate, requirePermission('CAREER_DELETE'), careersController.remove);
router.post(
  '/:id/apply',
  optionalAuth,
  createUploadMiddleware({ maxSize: 5 * 1024 * 1024, allowedMimes: [...ALLOWED_MIMES.document, ...ALLOWED_MIMES.image] }),
  validate(applyJobSchema),
  applicationsController.apply
);

module.exports = router;
