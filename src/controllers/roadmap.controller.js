const { query, transaction } = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const itemsRes = await query(`
      SELECT ri.*,
             EXISTS(SELECT 1 FROM roadmap_votes rv WHERE rv.roadmap_item_id = ri.id AND rv.user_id = $1) as "hasVoted"
      FROM roadmap_items ri
      ORDER BY ri.votes DESC, ri.created_at DESC
    `, [req.user?.id || null]);

    sendSuccess(res, { items: itemsRes.rows });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { title, description, category, status } = req.body;
    const resItem = await query(`
      INSERT INTO roadmap_items (title, description, category, status)
      VALUES ($1, $2, $3, COALESCE($4, 'PLANNED'))
      RETURNING *
    `, [title, description || null, category || null, status]);

    sendSuccess(res, { item: resItem.rows[0] }, 'Roadmap item created', 201);
  } catch (err) {
    next(err);
  }
};

const vote = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;

    await transaction(async (client) => {
      const voteCheck = await client.query('SELECT 1 FROM roadmap_votes WHERE user_id = $1 AND roadmap_item_id = $2', [userId, itemId]);
      if (voteCheck.rows.length > 0) {
        await client.query('DELETE FROM roadmap_votes WHERE user_id = $1 AND roadmap_item_id = $2', [userId, itemId]);
        await client.query('UPDATE roadmap_items SET votes = GREATEST(0, votes - 1) WHERE id = $1', [itemId]);
      } else {
        await client.query('INSERT INTO roadmap_votes (user_id, roadmap_item_id) VALUES ($1, $2)', [userId, itemId]);
        await client.query('UPDATE roadmap_items SET votes = votes + 1 WHERE id = $1', [itemId]);
      }
    });

    sendSuccess(res, { voted: true }, 'Vote updated');
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { title, description, category, status } = req.body;
    const resItem = await query(`
      UPDATE roadmap_items
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          status = COALESCE($4, status)
      WHERE id = $5
      RETURNING *
    `, [title, description, category, status, req.params.id]);

    if (!resItem.rows.length) throw new AppError('Item not found', 404, 'NOT_FOUND');
    sendSuccess(res, { item: resItem.rows[0] }, 'Item updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM roadmap_items WHERE id = $1', [req.params.id]);
    sendSuccess(res, null, 'Item deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, vote, update, remove };
