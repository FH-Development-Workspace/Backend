const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const controller = require('../controllers/commerce.controller');

const router = Router();
router.use(authenticate);
router.post('/', controller.createPurchase);
router.get('/', controller.listPurchases);
router.get('/:id', controller.getPurchase);

module.exports = router;