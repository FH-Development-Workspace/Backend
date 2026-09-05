const { query } = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const resPartners = await query('SELECT * FROM partners ORDER BY created_at DESC');
    sendSuccess(res, { partners: resPartners.rows });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, logoUrl, websiteUrl, description, tier } = req.body;
    const resPartner = await query(`
      INSERT INTO partners (name, logo_url, website_url, description, tier)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, logoUrl || null, websiteUrl || null, description || null, tier || null]);

    sendSuccess(res, { partner: resPartner.rows[0] }, 'Partner created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { name, logoUrl, websiteUrl, description, tier } = req.body;
    const resPartner = await query(`
      UPDATE partners
      SET name = COALESCE($1, name),
          logo_url = COALESCE($2, logo_url),
          website_url = COALESCE($3, website_url),
          description = COALESCE($4, description),
          tier = COALESCE($5, tier)
      WHERE id = $6
      RETURNING *
    `, [name, logoUrl, websiteUrl, description, tier, req.params.id]);

    if (!resPartner.rows.length) throw new AppError('Partner not found', 404, 'NOT_FOUND');
    sendSuccess(res, { partner: resPartner.rows[0] }, 'Partner updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM partners WHERE id = $1', [req.params.id]);
    sendSuccess(res, null, 'Partner deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove };
