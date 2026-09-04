const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createBlacklistSchema } = require('../validators/blacklist.validator');
const controller = require('../controllers/blacklist.controller');

const router = Router();
router.get('/check', controller.check);
router.use(authenticate, requirePermission('BLACKLIST_VIEW'));
router.get('/', controller.list);
router.post('/', requirePermission('BLACKLIST_MANAGE'), validate(createBlacklistSchema), controller.create);
router.delete('/:id', requirePermission('BLACKLIST_MANAGE'), controller.remove);

module.exports = router;