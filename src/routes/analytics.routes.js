const { Router } = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');

const router = Router();

router.use(authenticate, requirePermission('ANALYTICS_VIEW'));

router.get('/overview', analyticsController.overview);
router.get('/products', analyticsController.products);
router.get('/downloads', analyticsController.downloads);
router.get('/users', analyticsController.users);
router.get('/support', analyticsController.support);
router.get('/website', analyticsController.website);

module.exports = router;
