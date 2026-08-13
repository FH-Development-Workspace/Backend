const { Router } = require('express');
const productsController = require('../controllers/products.controller');
const productVersionsController = require('../controllers/productVersions.controller');
const productFilesController = require('../controllers/productFiles.controller');
const categoriesController = require('../controllers/categories.controller');
const downloadsController = require('../controllers/downloads.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createProductSchema, updateProductSchema, createVersionSchema, updateVersionSchema, createCategorySchema } = require('../validators/product.validator');
const { createUploadMiddleware } = require('../middleware/upload.middleware');

const router = Router();

router.get('/', optionalAuth, productsController.list);
router.get('/:slug', optionalAuth, productsController.getBySlug);
router.post('/', authenticate, requirePermission('PRODUCT_CREATE'), validate(createProductSchema), productsController.create);
router.patch('/:id', authenticate, requirePermission('PRODUCT_EDIT'), validate(updateProductSchema), productsController.update);
router.delete('/:id', authenticate, requirePermission('PRODUCT_DELETE'), productsController.remove);
router.post('/:id/publish', authenticate, requirePermission('PRODUCT_PUBLISH'), productsController.publish);

router.get('/:slug/downloads', downloadsController.getProductDownloads);

router.get('/:productId/versions', optionalAuth, productVersionsController.list);
router.post('/:productId/versions', authenticate, requirePermission('PRODUCT_EDIT'), validate(createVersionSchema), productVersionsController.create);

router.get('/:productId/files', optionalAuth, productFilesController.list);
router.post('/:productId/files', authenticate, requirePermission('PRODUCT_EDIT'), createUploadMiddleware({ maxSize: 500 * 1024 * 1024 }), productFilesController.upload);

const versionsRouter = Router({ mergeParams: true });
versionsRouter.patch('/:id', authenticate, requirePermission('PRODUCT_EDIT'), validate(updateVersionSchema), productVersionsController.update);
versionsRouter.delete('/:id', authenticate, requirePermission('PRODUCT_EDIT'), productVersionsController.remove);

const filesRouter = Router();
filesRouter.delete('/:id', authenticate, requirePermission('PRODUCT_EDIT'), productFilesController.remove);

const categoriesRouter = Router();
categoriesRouter.get('/', categoriesController.list);
categoriesRouter.post('/', authenticate, requirePermission('PRODUCT_CREATE'), validate(createCategorySchema), categoriesController.create);
categoriesRouter.patch('/:id', authenticate, requirePermission('PRODUCT_EDIT'), categoriesController.update);
categoriesRouter.delete('/:id', authenticate, requirePermission('PRODUCT_DELETE'), categoriesController.remove);

module.exports = router;
module.exports.versionsRouter = versionsRouter;
module.exports.filesRouter = filesRouter;
module.exports.categoriesRouter = categoriesRouter;
