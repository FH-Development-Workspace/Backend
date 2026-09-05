const { query } = require('../config/database');
const storageService = require('../services/storage.service');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const id = req.params.versionId || req.params.productId;
    const resFiles = await query(`
      SELECT pf.* FROM product_files pf
      JOIN product_versions pv ON pf.version_id = pv.id
      WHERE pv.product_id = $1 OR pf.version_id = $1
      ORDER BY pf.created_at DESC
    `, [id]);
    sendSuccess(res, { files: resFiles.rows });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { fileName, filePath, fileSize, mimeType, visibility, versionId } = req.body;
    const vId = req.params.versionId || versionId;

    const resFile = await query(`
      INSERT INTO product_files (version_id, file_name, file_path, file_size, mime_type, visibility)
      VALUES ($1, $2, $3, COALESCE($4, 0), $5, COALESCE($6, 'LICENSED'))
      RETURNING *
    `, [vId, fileName, filePath, fileSize, mimeType || null, visibility]);

    sendSuccess(res, { file: resFile.rows[0] }, 'Product file created', 201);
  } catch (err) {
    next(err);
  }
};

const upload = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('File required', 400, 'BAD_REQUEST');
    const storageResult = await storageService.upload(req.file, 'products');

    const { versionId, visibility } = req.body;
    const vId = req.params.versionId || versionId;

    const resFile = await query(`
      INSERT INTO product_files (version_id, file_name, file_path, file_size, mime_type, visibility)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'LICENSED'))
      RETURNING *
    `, [
      vId,
      req.file.originalname,
      storageResult.storageKey,
      req.file.size,
      req.file.mimetype,
      visibility,
    ]);

    sendSuccess(res, { file: resFile.rows[0] }, 'File uploaded', 201);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM product_files WHERE id = $1', [req.params.id]);
    sendSuccess(res, null, 'File deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, upload, remove };
