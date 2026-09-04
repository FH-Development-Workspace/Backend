const { z } = require('zod');

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99).optional(),
});

const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

module.exports = { cartItemSchema, updateCartItemSchema };