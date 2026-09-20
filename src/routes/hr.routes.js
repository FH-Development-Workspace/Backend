const express = require('express');
const router = express.Router();
const careersController = require('../controllers/careers.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');

// All HR routes require authentication
router.use(authenticate);

// HR overview
router.get('/overview', requirePermission('hr.view'), careersController.getOverview);

// Position management
router.get('/positions', requirePermission('hr.positions.view'), careersController.listAdmin);
router.post('/positions', requirePermission('hr.positions.create'), careersController.create);
router.put('/positions/:id', requirePermission('hr.positions.edit'), careersController.update);
router.delete('/positions/:id', requirePermission('hr.positions.delete'), careersController.remove);

// Application management
router.get('/applications', requirePermission('hr.applications.view'), careersController.listApplications);
router.get('/applications/:id', requirePermission('hr.applications.view'), careersController.getApplication);
router.put('/applications/:id/status', requirePermission('hr.applications.update'), careersController.updateApplicationStatus);
router.post('/applications/:id/notes', requirePermission('hr.applications.notes'), careersController.addNote);
router.put('/applications/:id/assign', requirePermission('hr.applications.assign'), careersController.assignApplication);

module.exports = router;
