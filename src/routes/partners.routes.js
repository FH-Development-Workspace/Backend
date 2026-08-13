const { Router } = require('express');
const partnersController = require('../controllers/partners.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createPartnerSchema } = require('../validators/company.validator');

const router = Router();

router.get('/', partnersController.list);
router.post('/', authenticate, requirePermission('PARTNER_CREATE'), validate(createPartnerSchema), partnersController.create);
router.patch('/:id', authenticate, requirePermission('PARTNER_EDIT'), partnersController.update);
router.delete('/:id', authenticate, requirePermission('PARTNER_DELETE'), partnersController.remove);

module.exports = router;
