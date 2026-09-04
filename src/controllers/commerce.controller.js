const prisma = require('../config/database');
const { AppError } = require('../middleware/error.middleware');
const { sendSuccess } = require('../utils/response');

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: { product: { select: { id: true, name: true, slug: true, priceGBP: true, coverImage: true, published: true } } },
  },
};

const getOrCreateCart = async (userId) => prisma.cart.upsert({
  where: { userId },
  create: { userId },
  update: {},
  include: cartInclude,
});

const withTotal = (cart) => ({
  ...cart,
  totalGBP: Number(cart.items.reduce((total, item) => total + item.product.priceGBP * item.quantity, 0).toFixed(2)),
});

const getCart = async (req, res, next) => {
  try { sendSuccess(res, { cart: withTotal(await getOrCreateCart(req.user.id)) }); } catch (err) { next(err); }
};

const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await prisma.product.findFirst({ where: { id: productId, published: true, deletedAt: null } });
    if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
    const cart = await prisma.cart.upsert({ where: { userId: req.user.id }, create: { userId: req.user.id }, update: {} });
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity: { increment: quantity } },
    });
    sendSuccess(res, { cart: withTotal(await getOrCreateCart(req.user.id)) }, 'Added to cart');
  } catch (err) { next(err); }
};

const updateCartItem = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    const result = await prisma.cartItem.updateMany({ where: { id: req.params.itemId, cartId: cart.id }, data: { quantity: req.body.quantity } });
    if (!result.count) throw new AppError('Cart item not found', 404, 'NOT_FOUND');
    sendSuccess(res, { cart: withTotal(await getOrCreateCart(req.user.id)) }, 'Cart updated');
  } catch (err) { next(err); }
};

const removeFromCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    const result = await prisma.cartItem.deleteMany({ where: { id: req.params.itemId, cartId: cart.id } });
    if (!result.count) throw new AppError('Cart item not found', 404, 'NOT_FOUND');
    sendSuccess(res, { cart: withTotal(await getOrCreateCart(req.user.id)) }, 'Item removed');
  } catch (err) { next(err); }
};

const clearCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    sendSuccess(res, { cart: withTotal(await getOrCreateCart(req.user.id)) }, 'Cart cleared');
  } catch (err) { next(err); }
};

const createPurchase = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    if (!cart.items.length) throw new AppError('Cart is empty', 400, 'EMPTY_CART');
    const totalGBP = Number(cart.items.reduce((total, item) => total + item.product.priceGBP * item.quantity, 0).toFixed(2));
    const purchase = await prisma.$transaction(async (transaction) => {
      const created = await transaction.purchase.create({
        data: {
          userId: req.user.id,
          totalGBP,
          items: { create: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPriceGBP: item.product.priceGBP })) },
        },
        include: { items: { include: { product: { select: { id: true, name: true, slug: true } } } } },
      });
      await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });
    sendSuccess(res, { purchase }, 'Purchase created and awaiting payment confirmation', 201);
  } catch (err) { next(err); }
};

const listPurchases = async (req, res, next) => {
  try {
    const purchases = await prisma.purchase.findMany({ where: { userId: req.user.id }, include: { items: { include: { product: { select: { id: true, name: true, slug: true } } } } }, orderBy: { createdAt: 'desc' } });
    sendSuccess(res, { purchases });
  } catch (err) { next(err); }
};

const getPurchase = async (req, res, next) => {
  try {
    const purchase = await prisma.purchase.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: { items: { include: { product: { select: { id: true, name: true, slug: true } } } } } });
    if (!purchase) throw new AppError('Purchase not found', 404, 'NOT_FOUND');
    sendSuccess(res, { purchase });
  } catch (err) { next(err); }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart, createPurchase, listPurchases, getPurchase };