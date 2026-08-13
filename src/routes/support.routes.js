const { Router } = require('express');
const supportController = require('../controllers/support.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createTicketSchema, replySchema, updateTicketSchema, assignSchema } = require('../validators/support.validator');
const { supportLimiter } = require('../middleware/rateLimit.middleware');

const router = Router();

router.use(authenticate);

router.get('/', supportController.list);
router.get('/:id', supportController.getById);
router.post('/', supportLimiter, validate(createTicketSchema), supportController.create);
router.post('/:id/reply', validate(replySchema), supportController.reply);
router.patch('/:id', requirePermission('SUPPORT_EDIT'), validate(updateTicketSchema), supportController.update);
router.post('/:id/assign', requirePermission('SUPPORT_ASSIGN'), validate(assignSchema), supportController.assign);

module.exports = router;
