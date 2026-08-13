const { Router } = require('express');
const notificationsController = require('../controllers/notifications.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', notificationsController.list);
router.patch('/:id/read', notificationsController.markRead);
router.post('/read-all', notificationsController.markAllRead);

module.exports = router;
