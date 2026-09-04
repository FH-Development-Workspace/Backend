const express = require('express');
const router = express.Router();
const hostingController = require('../controllers/hosting.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { hostingRequestSchema } = require('../validators/hosting.validator');

router.get('/plans', hostingController.getPlans);
router.get('/plans/:slug', hostingController.getPlan);

router.post('/request', authenticate, validate(hostingRequestSchema), hostingController.requestHosting);
router.get('/me', authenticate, hostingController.getMyHosting);
router.get('/me/:id', authenticate, hostingController.getMyHostingById);

module.exports = router;
