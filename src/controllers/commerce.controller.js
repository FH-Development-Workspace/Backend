const { query } = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const resItems = await query(`
      SELECT ci.*, p.name as "productName", p.slug as "productSlug", p.price_gbp as "priceGBP"
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1
    `, [userId]);

    sendSuccess(res, { items: resItems.rows });
  } catch (err) {
    next(err);
  }
};

const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    const resItem = await query(`
      INSERT INTO cart_items (user_id, product_id, quantity)
      VALUES ($1, $2, COALESCE($3, 1))
      ON CONFLICT (user_id, product_id) DO UPDATE
      SET quantity = cart_items.quantity + EXCLUDED.quantity
      RETURNING *
    `, [userId, productId, quantity]);

    sendSuccess(res, { item: resItem.rows[0] }, 'Added to cart');
  } catch (err) {
    next(err);
  }
};

const updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const resItem = await query(`
      UPDATE cart_items
      SET quantity = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [quantity, req.params.itemId, req.user.id]);

    sendSuccess(res, { item: resItem.rows[0] }, 'Cart item updated');
  } catch (err) {
    next(err);
  }
};

const removeFromCart = async (req, res, next) => {
  try {
    await query('DELETE FROM cart_items WHERE user_id = $1 AND (product_id = $2 OR id::text = $2)', [req.user.id, req.params.itemId || req.params.productId]);
    sendSuccess(res, null, 'Item removed');
  } catch (err) {
    next(err);
  }
};

const clearCart = async (req, res, next) => {
  try {
    await query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
    sendSuccess(res, null, 'Cart cleared');
  } catch (err) {
    next(err);
  }
};

const createPurchase = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, amountGBP, paymentMethod, reference } = req.body;

    const resPur = await query(`
      INSERT INTO purchases (user_id, product_id, amount_gbp, payment_method, reference, status)
      VALUES ($1, $2, COALESCE($3, 0.00), COALESCE($4, 'MANUAL'), $5, 'COMPLETED')
      RETURNING *
    `, [userId, productId || null, amountGBP, paymentMethod, reference || 'PUR-' + Date.now()]);

    sendSuccess(res, { purchase: resPur.rows[0] }, 'Purchase recorded', 201);
  } catch (err) {
    next(err);
  }
};

const listPurchases = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const resPur = await query(`
      SELECT pur.*, p.name as "productName", p.slug as "productSlug"
      FROM purchases pur
      LEFT JOIN products p ON pur.product_id = p.id
      WHERE pur.user_id = $1
      ORDER BY pur.created_at DESC
    `, [userId]);

    sendSuccess(res, { purchases: resPur.rows });
  } catch (err) {
    next(err);
  }
};

const getPurchase = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const resPur = await query(`
      SELECT pur.*, p.name as "productName", p.slug as "productSlug"
      FROM purchases pur
      LEFT JOIN products p ON pur.product_id = p.id
      WHERE pur.id = $1 AND pur.user_id = $2
    `, [req.params.id, userId]);

    if (!resPur.rows.length) throw new AppError('Purchase not found', 404, 'NOT_FOUND');
    sendSuccess(res, { purchase: resPur.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  createPurchase,
  listPurchases,
  getPurchases: listPurchases,
  getPurchase,
};