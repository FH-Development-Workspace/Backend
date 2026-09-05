const bcrypt = require('bcrypt');
const { query, transaction } = require('../config/database');
const env = require('../config/environment');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateSecureToken,
} = require('../utils/tokens');
const emailService = require('./email.service');
const auditService = require('./audit.service');
const analyticsService = require('./analytics.service');
const { AppError } = require('../middleware/error.middleware');

const SALT_ROUNDS = 12;

const hashPassword = async (password) => bcrypt.hash(password, SALT_ROUNDS);
const comparePassword = async (password, hash) => bcrypt.compare(password, hash);

const parseExpiry = (expiresStr) => {
  const match = expiresStr.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const [, num, unit] = match;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(num, 10) * multipliers[unit];
};

const formatUser = (userRow, profileRow = null, roles = []) => {
  if (!userRow) return null;
  return {
    id: userRow.id,
    username: userRow.username,
    email: userRow.email,
    emailVerified: userRow.email_verified,
    status: userRow.status,
    lastLoginAt: userRow.last_login_at,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
    profile: profileRow ? {
      id: profileRow.id,
      firstName: profileRow.first_name,
      lastName: profileRow.last_name,
      displayName: profileRow.display_name,
      avatar: profileRow.avatar,
      bio: profileRow.bio,
      company: profileRow.company,
      website: profileRow.website,
    } : null,
    roles: roles.map(r => typeof r === 'string' ? r : r.slug),
  };
};

const getUserWithProfileAndRoles = async (userId) => {
  const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
  if (!userRes.rows.length) return null;
  const userRow = userRes.rows[0];

  const profileRes = await query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
  const profileRow = profileRes.rows[0] || null;

  const rolesRes = await query(`
    SELECT r.slug FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = $1
  `, [userId]);
  const roles = rolesRes.rows.map(r => r.slug);

  return formatUser(userRow, profileRow, roles);
};

const createSession = async (userId, req) => {
  const refreshToken = signRefreshToken({ userId, sessionId: generateSecureToken(16) });
  const expiresAt = new Date(Date.now() + parseExpiry(env.jwt.refreshExpires));

  const res = await query(`
    INSERT INTO sessions (user_id, refresh_token, user_agent, ip_address, expires_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [userId, refreshToken, req.headers['user-agent'] || null, req.ip, expiresAt]);

  return { session: res.rows[0], refreshToken };
};

const issueTokens = (user) => {
  const accessToken = signAccessToken({ userId: user.id, email: user.email, roles: user.roles });
  return { accessToken };
};

const register = async (data, req) => {
  const existing = await query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)',
    [data.email, data.username]
  );
  if (existing.rows.length > 0) {
    throw new AppError('Email or username already in use', 409, 'CONFLICT');
  }

  const passwordHash = await hashPassword(data.password);

  return await transaction(async (client) => {
    const userRes = await client.query(`
      INSERT INTO users (username, email, password_hash, status)
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING *
    `, [data.username, data.email, passwordHash]);

    const userRow = userRes.rows[0];

    const profileRes = await client.query(`
      INSERT INTO profiles (user_id, first_name, last_name, display_name)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userRow.id, data.firstName || null, data.lastName || null, data.displayName || data.username]);

    const roleRes = await client.query(`SELECT id FROM roles WHERE slug = 'user'`);
    if (roleRes.rows.length > 0) {
      await client.query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
      `, [userRow.id, roleRes.rows[0].id]);
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await client.query(`
      INSERT INTO email_verification_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `, [userRow.id, token, expiresAt]);

    const verifyLink = `${env.frontendUrl}/verify-email?token=${token}`;
    await emailService.sendTemplate(userRow.email, 'emailVerification', {
      name: data.displayName || data.username,
      link: verifyLink,
    });

    await analyticsService.logEvent('REGISTER', { userId: userRow.id, ipAddress: req.ip });

    return formatUser(userRow, profileRes.rows[0], ['user']);
  });
};

const login = async (data, req) => {
  const userRes = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [data.email]);
  if (!userRes.rows.length) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const userRow = userRes.rows[0];
  if (!(await comparePassword(data.password, userRow.password_hash))) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  if (userRow.status === 'BANNED' || userRow.status === 'DELETED') {
    throw new AppError('Account not available', 403, 'ACCOUNT_UNAVAILABLE');
  }

  if (userRow.status === 'SUSPENDED') {
    throw new AppError('Account suspended', 403, 'ACCOUNT_SUSPENDED');
  }

  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userRow.id]);

  const user = await getUserWithProfileAndRoles(userRow.id);

  const { session, refreshToken } = await createSession(user.id, req);
  const { accessToken } = issueTokens(user);

  await emailService.sendTemplate(user.email, 'loginAlert', {
    name: user.profile?.displayName || user.username,
    ip: req.ip,
  });

  await analyticsService.logEvent('LOGIN', { userId: user.id, ipAddress: req.ip });

  return { user, accessToken, refreshToken };
};

const logout = async (refreshToken) => {
  if (!refreshToken) return;
  await query('UPDATE sessions SET revoked_at = NOW() WHERE refresh_token = $1 AND revoked_at IS NULL', [refreshToken]);
};

const refresh = async (refreshToken, req) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }

  const sessionRes = await query('SELECT * FROM sessions WHERE refresh_token = $1', [refreshToken]);
  if (!sessionRes.rows.length) {
    throw new AppError('Session not found', 401, 'SESSION_EXPIRED');
  }

  const session = sessionRes.rows[0];
  if (session.revoked_at || new Date(session.expires_at) < new Date()) {
    throw new AppError('Session expired', 401, 'SESSION_EXPIRED');
  }

  await query('UPDATE sessions SET revoked_at = NOW() WHERE id = $1', [session.id]);

  const user = await getUserWithProfileAndRoles(session.user_id);
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  const { session: newSession, refreshToken: newRefreshToken } = await createSession(session.user_id, req);
  const { accessToken } = issueTokens(user);

  return { user, accessToken, refreshToken: newRefreshToken };
};

const verifyEmail = async (token) => {
  const tokenRes = await query('SELECT * FROM email_verification_tokens WHERE token = $1', [token]);
  if (!tokenRes.rows.length) {
    throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
  }

  const record = tokenRes.rows[0];
  if (record.used_at || new Date(record.expires_at) < new Date()) {
    throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
  }

  await transaction(async (client) => {
    await client.query('UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1', [record.id]);
    await client.query("UPDATE users SET email_verified = true, status = 'ACTIVE' WHERE id = $1", [record.user_id]);
  });

  const userRes = await query('SELECT * FROM users WHERE id = $1', [record.user_id]);
  if (userRes.rows.length > 0) {
    await emailService.sendTemplate(userRes.rows[0].email, 'welcome', {
      name: userRes.rows[0].username,
    });
  }

  return { verified: true };
};

const resendVerification = async (email) => {
  const userRes = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  if (!userRes.rows.length || userRes.rows[0].email_verified) {
    return { sent: true };
  }

  const user = userRes.rows[0];
  await query('DELETE FROM email_verification_tokens WHERE user_id = $1', [user.id]);

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await query('INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt]);

  const verifyLink = `${env.frontendUrl}/verify-email?token=${token}`;
  await emailService.sendTemplate(user.email, 'emailVerification', {
    name: user.username,
    link: verifyLink,
  });

  return { sent: true };
};

const forgotPassword = async (email) => {
  const userRes = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  if (!userRes.rows.length) return { sent: true };

  const user = userRes.rows[0];
  await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt]);

  const resetLink = `${env.frontendUrl}/reset-password?token=${token}`;
  await emailService.sendTemplate(user.email, 'passwordReset', {
    name: user.username,
    link: resetLink,
  });

  return { sent: true };
};

const resetPassword = async (token, newPassword) => {
  const tokenRes = await query('SELECT * FROM password_reset_tokens WHERE token = $1', [token]);
  if (!tokenRes.rows.length) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
  }

  const record = tokenRes.rows[0];
  if (record.used_at || new Date(record.expires_at) < new Date()) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
  }

  const passwordHash = await hashPassword(newPassword);

  await transaction(async (client) => {
    await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [record.id]);
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, record.user_id]);
    await client.query('UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [record.user_id]);
  });

  return { reset: true };
};

const getMe = async (userId) => {
  const user = await getUserWithProfileAndRoles(userId);
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  return user;
};

module.exports = {
  hashPassword,
  comparePassword,
  register,
  login,
  logout,
  refresh,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getMe,
};
