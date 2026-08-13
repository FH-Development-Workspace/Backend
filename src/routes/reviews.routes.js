const { Router } = require('express');
const reviewsController = require('../controllers/reviews.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createReviewSchema } = require('../validators/content.validator');
const { reviewLimiter } = require('../middleware/rateLimit.middleware');

const router = Router();

router.get('/', optionalAuth, reviewsController.list);
router.get('/pending', authenticate, requirePermission('REVIEW_MODERATE'), reviewsController.listPending);
router.post('/', authenticate, reviewLimiter, validate(createReviewSchema), reviewsController.create);
router.patch('/:id/moderate', authenticate, requirePermission('REVIEW_MODERATE'), reviewsController.moderate);

module.exports = router;
