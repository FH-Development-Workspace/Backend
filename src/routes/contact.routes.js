const { Router } = require('express');
const contactController = require('../controllers/contact.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { contactSchema } = require('../validators/company.validator');
const { contactLimiter } = require('../middleware/rateLimit.middleware');

const router = Router();

router.post('/', contactLimiter, validate(contactSchema), contactController.submit);
router.get('/', authenticate, requirePermission('CONTACT_VIEW'), contactController.list);
router.patch('/:id', authenticate, requirePermission('CONTACT_EDIT'), contactController.updateStatus);

module.exports = router;
