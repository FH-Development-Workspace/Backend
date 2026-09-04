const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { cartItemSchema, updateCartItemSchema } = require('../validators/commerce.validator');
const controller = require('../controllers/commerce.controller');

const router = Router();
router.use(authenticate);
router.get('/', controller.getCart);
router.post('/items', validate(cartItemSchema), controller.addToCart);
router.patch('/items/:itemId', validate(updateCartItemSchema), controller.updateCartItem);
router.delete('/items/:itemId', controller.removeFromCart);
router.delete('/', controller.clearCart);

module.exports = router;