const { Router } = require('express');
const companyController = require('../controllers/company.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { updateCompanyProfileSchema } = require('../validators/company.validator');

const router = Router();

router.get('/', companyController.getProfile);
router.get('/timeline', companyController.getTimeline);
router.patch('/', authenticate, requirePermission('COMPANY_EDIT'), validate(updateCompanyProfileSchema), companyController.updateProfile);
router.post('/timeline', authenticate, requirePermission('COMPANY_EDIT'), companyController.createTimelineEvent);
router.post('/values', authenticate, requirePermission('COMPANY_EDIT'), companyController.createValue);

module.exports = router;
