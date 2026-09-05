const { query } = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const resVer = await query('SELECT * FROM product_versions WHERE product_id = $1 ORDER BY created_at DESC', [req.params.productId]);
    sendSuccess(res, { versions: resVer.rows });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { version, changelog, status } = req.body;
    const { productId } = req.params;

    const resVer = await query(`
      INSERT INTO product_versions (product_id, version, changelog, status)
      VALUES ($1, $2, $3, COALESCE($4, 'RELEASED'))
      RETURNING *
    `, [productId, version, changelog || null, status]);

    sendSuccess(res, { version: resVer.rows[0] }, 'Version created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { version, changelog, status } = req.body;
    const resVer = await query(`
      UPDATE product_versions
      SET version = COALESCE($1, version),
          changelog = COALESCE($2, changelog),
          status = COALESCE($3, status),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [version, changelog, status, req.params.id]);

    if (!resVer.rows.length) throw new AppError('Version not found', 404, 'NOT_FOUND');
    sendSuccess(res, { version: resVer.rows[0] }, 'Version updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM product_versions WHERE id = $1', [req.params.id]);
    sendSuccess(res, null, 'Version deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove };
