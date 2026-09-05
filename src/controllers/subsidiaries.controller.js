const { query } = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const resSub = await query('SELECT * FROM subsidiaries ORDER BY created_at DESC');
    sendSuccess(res, { subsidiaries: resSub.rows });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, description, logoUrl, websiteUrl } = req.body;
    const resSub = await query(`
      INSERT INTO subsidiaries (name, description, logo_url, website_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, description || null, logoUrl || null, websiteUrl || null]);

    sendSuccess(res, { subsidiary: resSub.rows[0] }, 'Subsidiary created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { name, description, logoUrl, websiteUrl } = req.body;
    const resSub = await query(`
      UPDATE subsidiaries
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          logo_url = COALESCE($3, logo_url),
          website_url = COALESCE($4, website_url)
      WHERE id = $5
      RETURNING *
    `, [name, description, logoUrl, websiteUrl, req.params.id]);

    if (!resSub.rows.length) throw new AppError('Subsidiary not found', 404, 'NOT_FOUND');
    sendSuccess(res, { subsidiary: resSub.rows[0] }, 'Subsidiary updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM subsidiaries WHERE id = $1', [req.params.id]);
    sendSuccess(res, null, 'Subsidiary deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove };
