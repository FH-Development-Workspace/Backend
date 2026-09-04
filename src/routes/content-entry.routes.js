const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { contentEntrySchema, contentEntryUpdateSchema } = require('../validators/content-entry.validator');
const controller = require('../controllers/content-entry.controller');

const createTypeRouter = (type) => {
  const router = Router();
  router.use((req, res, next) => { req.contentType = type; next(); });
  router.get('/', controller.list);
  router.get('/admin', authenticate, requirePermission('CONTENT_VIEW'), controller.listAdmin);
  router.post('/', authenticate, requirePermission('CONTENT_MANAGE'), validate(contentEntrySchema.omit({ type: true })), controller.create);
  router.patch('/:id', authenticate, requirePermission('CONTENT_MANAGE'), validate(contentEntryUpdateSchema), controller.update);
  router.delete('/:id', authenticate, requirePermission('CONTENT_MANAGE'), controller.remove);
  return router;
};

module.exports = { createTypeRouter };