const express = require('express');
const router = express.Router();
const hostingController = require('../controllers/hosting.controller');
// const { protect } = require('../middleware/auth.middleware');

router.get('/plans', hostingController.getPlans);
router.get('/plans/:slug', hostingController.getPlan);

// TODO: uncomment auth protection when auth middleware is fully functional or mapped
// router.post('/request', protect, hostingController.requestHosting);
// router.get('/me', protect, hostingController.getMyHosting);

// For now just route directly:
router.post('/request', (req, res, next) => {
    // mock auth if necessary or just use middleware if you uncomment above
    if (!req.user) req.user = { id: 'mock-user-id' }; 
    next();
}, hostingController.requestHosting);

router.get('/me', (req, res, next) => {
    if (!req.user) req.user = { id: 'mock-user-id' }; 
    next();
}, hostingController.getMyHosting);

module.exports = router;
