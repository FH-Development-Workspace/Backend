const express = require('express');
const router = express.Router();
const careersController = require('../controllers/careers.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');

// Public routes - no authentication required
router.get('/', careersController.listPublic);
router.get('/:slug', careersController.getBySlug);

// Application submission - authentication optional
router.post('/:positionId/apply', authenticate, careersController.submitApplication);

module.exports = router;
