const { query } = require('../config/database');
const storageService = require('./storage.service');
const emailService = require('./email.service');
const analyticsService = require('./analytics.service');
const auditService = require('./audit.service');
const { AppError } = require('../middleware/error.middleware');

const generateReceiptNumber = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `FH-${year}-${rand}`;
};

const checkDownloadPermission = async (userId, file) => {
  if (file.visibility === 'PUBLIC') return true;
  if (file.visibility === 'AUTHENTICATED' && userId) return true;

  if (file.visibility === 'LICENSED') {
    if (!userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const licRes = await query(`
      SELECT id FROM licenses
      WHERE user_id = $1 AND product_id = $2 AND status = 'ACTIVE'
        AND (expires_at IS NULL OR expires_at > NOW())
    `, [userId, file.product_id]);

    if (!licRes.rows.length) {
      throw new AppError('Valid license required for this download', 403, 'LICENSE_REQUIRED');
    }
  }

  return true;
};

const requestDownload = async (userId, fileId, req) => {
  const fileRes = await query(`
    SELECT pf.*, pv.product_id, p.name as product_name
    FROM product_files pf
    JOIN product_versions pv ON pf.version_id = pv.id
    JOIN products p ON pv.product_id = p.id
    WHERE pf.id = $1
  `, [fileId]);

  if (!fileRes.rows.length) {
    throw new AppError('File not found', 404, 'NOT_FOUND');
  }

  const file = fileRes.rows[0];
  await checkDownloadPermission(userId, file);

  const receiptNumber = generateReceiptNumber();

  await auditService.log({
    actorId: userId || null,
    action: 'FILE_DOWNLOAD',
    resource: 'product_file',
    resourceId: file.id,
    details: { receiptNumber, fileName: file.file_name },
    ipAddress: req?.ip,
  });

  const signedUrl = await storageService.getSignedDownloadUrl(file.file_path || file.file_name);

  if (userId) {
    const userRes = await query('SELECT username, email FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length > 0) {
      await emailService.sendTemplate(userRes.rows[0].email, 'downloadReceipt', {
        name: userRes.rows[0].username,
        receiptNumber,
        productName: file.product_name,
      });
    }
  }

  return {
    receiptNumber,
    fileName: file.file_name,
    url: signedUrl,
    expiresIn: 3600,
  };
};

const getProductDownloads = async (slug) => {
  const prodRes = await query("SELECT id, name, slug FROM products WHERE slug = $1 AND status = 'ACTIVE'", [slug]);
  if (!prodRes.rows.length) throw new AppError('Product not found', 404, 'NOT_FOUND');
  const product = prodRes.rows[0];

  const verRes = await query(`
    SELECT pv.id as version_id, pv.version, pv.changelog,
           pf.id as file_id, pf.file_name, pf.file_size, pf.mime_type, pf.visibility
    FROM product_versions pv
    LEFT JOIN product_files pf ON pf.version_id = pv.id
    WHERE pv.product_id = $1 AND pv.status = 'RELEASED'
    ORDER BY pv.created_at DESC
  `, [product.id]);

  const versionsMap = {};
  for (const row of verRes.rows) {
    if (!versionsMap[row.version_id]) {
      versionsMap[row.version_id] = {
        version: row.version,
        changelog: row.changelog,
        files: [],
      };
    }
    if (row.file_id) {
      versionsMap[row.version_id].files.push({
        id: row.file_id,
        fileName: row.file_name,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        visibility: row.visibility,
      });
    }
  }

  return Object.values(versionsMap);
};

const getUserDownloads = async (userId, { skip = 0, limit = 20 }) => {
  const countRes = await query("SELECT COUNT(*) FROM audit_logs WHERE user_id = $1 AND action = 'FILE_DOWNLOAD'", [userId]);
  const total = parseInt(countRes.rows[0].count, 10);

  const itemsRes = await query(`
    SELECT id, resource_id as "fileId", details, created_at as "createdAt"
    FROM audit_logs
    WHERE user_id = $1 AND action = 'FILE_DOWNLOAD'
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `, [userId, limit, skip]);

  return { items: itemsRes.rows, total };
};

module.exports = {
  requestDownload,
  getProductDownloads,
  getUserDownloads,
  checkDownloadPermission,
};
