const { Router } = require('express');
const usersController = require('../controllers/users.controller');
const accountController = require('../controllers/account.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createUserSchema, updateUserSchema } = require('../validators/user.validator');

const router = Router();

router.use(authenticate);

router.get('/me', accountController.getAccount);
router.get('/', requirePermission('USER_VIEW'), usersController.list);
router.get('/:id', requirePermission('USER_VIEW'), usersController.getById);
router.post('/', requirePermission('USER_CREATE'), validate(createUserSchema), usersController.create);
router.patch('/:id', requirePermission('USER_EDIT'), validate(updateUserSchema), usersController.update);
router.post('/:id/suspend', requirePermission('USER_SUSPEND'), usersController.suspend);
router.delete('/:id', requirePermission('USER_DELETE'), usersController.softDelete);

module.exports = router;
