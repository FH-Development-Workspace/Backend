const { query, transaction } = require('../config/database');
const { generateLicenseKey } = require('../utils/tokens');
const emailService = require('./email.service');
const notificationService = require('./notification.service');
const auditService = require('./audit.service');
const analyticsService = require('./analytics.service');
const { AppError } = require('../middleware/error.middleware');

const createLicense = async (data, actorId, req) => {
  const productRes = await query('SELECT id, name, slug FROM products WHERE id = $1', [data.productId]);
  if (!productRes.rows.length) throw new AppError('Product not found', 404, 'NOT_FOUND');
  const product = productRes.rows[0];

  const userRes = await query('SELECT id, email, username FROM users WHERE id = $1', [data.userId]);
  if (!userRes.rows.length) throw new AppError('User not found', 404, 'NOT_FOUND');
  const user = userRes.rows[0];

  let licenseKey;
  let attempts = 0;
  do {
    licenseKey = generateLicenseKey();
    attempts++;
    const check = await query('SELECT id FROM licenses WHERE license_key = $1', [licenseKey]);
    if (!check.rows.length) break;
  } while (attempts < 10);

  const maxActivations = data.activationLimit || data.maxActivations || 1;
  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

  const licRes = await query(`
    INSERT INTO licenses (user_id, product_id, license_key, type, status, max_activations, expires_at)
    VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6)
    RETURNING *
  `, [user.id, product.id, licenseKey, data.type || 'COMMERCIAL', maxActivations, expiresAt]);

  const license = licRes.rows[0];

  await query(`
    INSERT INTO license_events (license_id, event_type, details)
    VALUES ($1, 'CREATED', $2)
  `, [license.id, JSON.stringify({ actorId })]);

  await auditService.log({
    actorId,
    action: 'LICENSE_ISSUED',
    resource: 'license',
    resourceId: license.id,
    ipAddress: req?.ip,
    userAgent: req?.headers?.['user-agent'],
  });

  await emailService.sendTemplate(user.email, 'licenseCreated', {
    name: user.username,
    productName: product.name,
    licenseKey,
  });

  await notificationService.create(user.id, {
    type: 'LICENSE',
    title: 'License Created',
    message: `Your license for ${product.name} has been created.`,
    link: `/client-dashboard/licenses.html`,
  });

  return { ...license, product, user };
};

const activateLicense = async (licenseKey, hwid, userAgent, req) => {
  const licRes = await query(`
    SELECT l.*, p.name as product_name
    FROM licenses l
    JOIN products p ON l.product_id = p.id
    WHERE l.license_key = $1
  `, [licenseKey]);

  if (!licRes.rows.length) throw new AppError('Invalid license key', 404, 'NOT_FOUND');
  const license = licRes.rows[0];

  if (license.status !== 'ACTIVE') {
    throw new AppError(`License is ${license.status.toLowerCase()}`, 403, 'LICENSE_INACTIVE');
  }

  if (license.expires_at && new Date(license.expires_at) < new Date()) {
    await query("UPDATE licenses SET status = 'EXPIRED' WHERE id = $1", [license.id]);
    throw new AppError('License has expired', 403, 'LICENSE_EXPIRED');
  }

  if (license.current_activations >= license.max_activations) {
    throw new AppError('Activation limit reached', 403, 'ACTIVATION_LIMIT');
  }

  const existing = await query(`
    SELECT * FROM license_activations
    WHERE license_id = $1 AND hwid = $2
  `, [license.id, hwid]);

  if (existing.rows.length > 0) {
    await query('UPDATE license_activations SET last_check_in = NOW() WHERE id = $1', [existing.rows[0].id]);
    return { activation: existing.rows[0], license };
  }

  const actRes = await query(`
    INSERT INTO license_activations (license_id, ip_address, hwid, user_agent)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [license.id, req?.ip, hwid, userAgent]);

  await query('UPDATE licenses SET current_activations = current_activations + 1 WHERE id = $1', [license.id]);

  await query(`
    INSERT INTO license_events (license_id, event_type, details)
    VALUES ($1, 'ACTIVATED', $2)
  `, [license.id, JSON.stringify({ hwid, userAgent })]);

  return { activation: actRes.rows[0], license };
};

const deactivateLicense = async (licenseKey, hwid, userId) => {
  const licRes = await query('SELECT * FROM licenses WHERE license_key = $1', [licenseKey]);
  if (!licRes.rows.length) throw new AppError('Invalid license key', 404, 'NOT_FOUND');
  const license = licRes.rows[0];

  if (license.user_id !== userId) throw new AppError('Access denied', 403, 'FORBIDDEN');

  const actRes = await query('SELECT * FROM license_activations WHERE license_id = $1 AND hwid = $2', [license.id, hwid]);
  if (!actRes.rows.length) throw new AppError('Activation not found', 404, 'NOT_FOUND');

  await query('DELETE FROM license_activations WHERE id = $1', [actRes.rows[0].id]);
  await query('UPDATE licenses SET current_activations = GREATEST(0, current_activations - 1) WHERE id = $1', [license.id]);

  await query(`
    INSERT INTO license_events (license_id, event_type, details)
    VALUES ($1, 'DEACTIVATED', $2)
  `, [license.id, JSON.stringify({ hwid })]);

  return { deactivated: true };
};

const revokeLicense = async (licenseId, actorId, req) => {
  const res = await query("UPDATE licenses SET status = 'REVOKED' WHERE id = $1 RETURNING *", [licenseId]);
  if (!res.rows.length) throw new AppError('License not found', 404, 'NOT_FOUND');

  await query(`
    INSERT INTO license_events (license_id, event_type, details)
    VALUES ($1, 'REVOKED', $2)
  `, [licenseId, JSON.stringify({ actorId })]);

  await auditService.log({
    actorId,
    action: 'LICENSE_REVOKED',
    resource: 'license',
    resourceId: licenseId,
    ipAddress: req?.ip,
  });

  return res.rows[0];
};

const renewLicense = async (licenseId, expiresAt, actorId) => {
  const res = await query("UPDATE licenses SET expires_at = $1, status = 'ACTIVE' WHERE id = $2 RETURNING *", [new Date(expiresAt), licenseId]);
  if (!res.rows.length) throw new AppError('License not found', 404, 'NOT_FOUND');

  await query(`
    INSERT INTO license_events (license_id, event_type, details)
    VALUES ($1, 'RENEWED', $2)
  `, [licenseId, JSON.stringify({ actorId, expiresAt })]);

  return res.rows[0];
};

const getUserLicenses = async (userId, { skip = 0, limit = 20 }) => {
  const countRes = await query('SELECT COUNT(*) FROM licenses WHERE user_id = $1', [userId]);
  const total = parseInt(countRes.rows[0].count, 10);

  const itemsRes = await query(`
    SELECT l.*, p.name as "productName", p.slug as "productSlug"
    FROM licenses l
    JOIN products p ON l.product_id = p.id
    WHERE l.user_id = $1
    ORDER BY l.created_at DESC
    LIMIT $2 OFFSET $3
  `, [userId, limit, skip]);

  return { items: itemsRes.rows, total };
};

module.exports = {
  createLicense,
  activateLicense,
  deactivateLicense,
  revokeLicense,
  renewLicense,
  getUserLicenses,
};
