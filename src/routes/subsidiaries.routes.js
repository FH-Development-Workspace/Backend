const { Router } = require('express');
const subsidiariesController = require('../controllers/subsidiaries.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createPartnerSchema } = require('../validators/company.validator');

const router = Router();

router.get('/', subsidiariesController.list);
router.post('/', authenticate, requirePermission('SUBSIDIARY_CREATE'), validate(createPartnerSchema), subsidiariesController.create);
router.patch('/:id', authenticate, requirePermission('SUBSIDIARY_EDIT'), subsidiariesController.update);
router.delete('/:id', authenticate, requirePermission('SUBSIDIARY_DELETE'), subsidiariesController.remove);

module.exports = router;
