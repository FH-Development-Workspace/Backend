const { query, transaction } = require('../config/database');
const authService = require('../services/auth.service');
const auditService = require('../services/audit.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { sanitizeUser } = require('../utils/permissions');
const { AppError } = require('../middleware/error.middleware');

const formatUserObj = (u) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  status: u.status,
  emailVerified: u.email_verified,
  lastLoginAt: u.last_login_at,
  createdAt: u.created_at,
  profile: u.display_name || u.first_name ? {
    displayName: u.display_name,
    firstName: u.first_name,
    lastName: u.last_name,
    avatar: u.avatar,
    bio: u.bio,
  } : null,
  roles: u.roles ? u.roles.split(',').filter(Boolean) : [],
});

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    let whereClauses = ['u.deleted_at IS NULL'];
    let params = [];

    if (req.query.status) {
      params.push(req.query.status);
      whereClauses.push(`u.status = $${params.length}`);
    }

    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      whereClauses.push(`(u.email ILIKE $${params.length} OR u.username ILIKE $${params.length})`);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countRes = await query(`SELECT COUNT(*) FROM users u ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const listParams = [...params, limit, skip];
    const usersRes = await query(`
      SELECT u.*, p.display_name, p.first_name, p.last_name, p.avatar, p.bio,
             STRING_AGG(r.slug, ',') as roles
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereSql}
      GROUP BY u.id, p.id
      ORDER BY u.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, listParams);

    const formatted = usersRes.rows.map(formatUserObj).map(sanitizeUser);
    sendPaginated(res, formatted, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const userRes = await query(`
      SELECT u.*, p.display_name, p.first_name, p.last_name, p.avatar, p.bio,
             STRING_AGG(r.slug, ',') as roles
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1
      GROUP BY u.id, p.id
    `, [req.params.id]);

    if (!userRes.rows.length) throw new AppError('User not found', 404, 'NOT_FOUND');
    sendSuccess(res, { user: sanitizeUser(formatUserObj(userRes.rows[0])) });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const passwordHash = await authService.hashPassword(req.body.password);
    const { roleIds, username, email, status, firstName, lastName, displayName } = req.body;

    const user = await transaction(async (client) => {
      const uRes = await client.query(`
        INSERT INTO users (username, email, password_hash, status, email_verified)
        VALUES ($1, $2, $3, COALESCE($4, 'ACTIVE'), true)
        RETURNING *
      `, [username, email, passwordHash, status]);

      const userRow = uRes.rows[0];

      await client.query(`
        INSERT INTO profiles (user_id, first_name, last_name, display_name)
        VALUES ($1, $2, $3, $4)
      `, [userRow.id, firstName || null, lastName || null, displayName || username]);

      if (roleIds?.length) {
        for (const roleId of roleIds) {
          await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [userRow.id, roleId]);
        }
      }

      return userRow;
    });

    await auditService.log({
      actorId: req.user.id,
      action: 'USER_CREATED',
      resource: 'user',
      resourceId: user.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { user: sanitizeUser(formatUserObj(user)) }, 'User created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { password, roleIds, username, email, status } = req.body;
    const userId = req.params.id;

    if (password) {
      const passwordHash = await authService.hashPassword(password);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    }

    if (username || email || status) {
      await query(`
        UPDATE users
        SET username = COALESCE($1, username),
            email = COALESCE($2, email),
            status = COALESCE($3, status),
            updated_at = NOW()
        WHERE id = $4
      `, [username, email, status, userId]);
    }

    if (roleIds) {
      await query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
      for (const roleId of roleIds) {
        await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
      }
    }

    const userRes = await query(`
      SELECT u.*, p.display_name, p.first_name, p.last_name, p.avatar, p.bio,
             STRING_AGG(r.slug, ',') as roles
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1
      GROUP BY u.id, p.id
    `, [userId]);

    if (!userRes.rows.length) throw new AppError('User not found', 404, 'NOT_FOUND');

    await auditService.log({
      actorId: req.user.id,
      action: 'USER_UPDATED',
      resource: 'user',
      resourceId: userId,
      ipAddress: req.ip,
    });

    sendSuccess(res, { user: sanitizeUser(formatUserObj(userRes.rows[0])) }, 'User updated');
  } catch (err) {
    next(err);
  }
};

const suspend = async (req, res, next) => {
  try {
    const userRes = await query("UPDATE users SET status = 'SUSPENDED', updated_at = NOW() WHERE id = $1 RETURNING *", [req.params.id]);
    if (!userRes.rows.length) throw new AppError('User not found', 404, 'NOT_FOUND');

    await auditService.log({
      actorId: req.user.id,
      action: 'USER_SUSPENDED',
      resource: 'user',
      resourceId: req.params.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { user: sanitizeUser(formatUserObj(userRes.rows[0])) }, 'User suspended');
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await query("UPDATE users SET status = 'DELETED', deleted_at = NOW(), deleted_by = $1 WHERE id = $2", [req.user.id, req.params.id]);
    await auditService.log({
      actorId: req.user.id,
      action: 'USER_DELETED',
      resource: 'user',
      resourceId: req.params.id,
      ipAddress: req.ip,
    });
    sendSuccess(res, null, 'User deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, suspend, softDelete };
