const { Router } = require('express');
const accountController = require('../controllers/account.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
  updateProfileSchema, updateAccountSchema, changePasswordSchema,
  deleteAccountSchema,
} = require('../validators/user.validator');

const router = Router();

router.use(authenticate);

router.get('/', accountController.getAccount);
router.patch('/', validate(updateAccountSchema), accountController.updateAccount);
router.patch('/profile', validate(updateProfileSchema), accountController.updateProfile);
router.post('/change-password', validate(changePasswordSchema), accountController.changePassword);
router.delete('/', validate(deleteAccountSchema), accountController.deleteAccount);
router.get('/sessions', accountController.getSessions);
router.delete('/sessions/:id', accountController.revokeSession);
router.get('/downloads', accountController.getDownloads);
router.get('/licenses', accountController.getLicenses);
router.get('/support', accountController.getSupportTickets);
router.get('/notifications', accountController.getNotifications);

module.exports = router;
