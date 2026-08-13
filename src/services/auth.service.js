const bcrypt = require('bcrypt');
const prisma = require('../config/database');
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

const createSession = async (userId, req) => {
  const refreshToken = signRefreshToken({ userId, sessionId: generateSecureToken(16) });
  const expiresAt = new Date(Date.now() + parseExpiry(env.jwt.refreshExpires));

  const session = await prisma.session.create({
    data: {
      userId,
      refreshToken,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip,
      expiresAt,
    },
  });

  return { session, refreshToken };
};

const issueTokens = (user) => {
  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  return { accessToken };
};

const register = async (data, req) => {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { username: data.username }] },
  });
  if (existing) {
    throw new AppError('Email or username already in use', 409, 'CONFLICT');
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      username: data.username,
      email: data.email,
      passwordHash,
      status: 'PENDING',
      profile: {
        create: {
          firstName: data.firstName,
          lastName: data.lastName,
          displayName: data.displayName || data.username,
        },
      },
    },
    include: { profile: true },
  });

  const userRole = await prisma.role.findUnique({ where: { slug: 'user' } });
  if (userRole) {
    await prisma.userRole.create({ data: { userId: user.id, roleId: userRole.id } });
  }

  const token = generateSecureToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const verifyLink = `${env.frontendUrl}/verify-email?token=${token}`;
  await emailService.sendTemplate(user.email, 'emailVerification', {
    name: user.profile?.displayName || user.username,
    link: verifyLink,
  });

  await analyticsService.logEvent('REGISTER', { userId: user.id, ipAddress: req.ip });

  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
};

const login = async (data, req) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: { profile: true },
  });

  if (!user || !(await comparePassword(data.password, user.passwordHash))) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  if (user.status === 'BANNED' || user.status === 'DELETED') {
    throw new AppError('Account not available', 403, 'ACCOUNT_UNAVAILABLE');
  }

  if (user.status === 'SUSPENDED') {
    throw new AppError('Account suspended', 403, 'ACCOUNT_SUSPENDED');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const { session, refreshToken } = await createSession(user.id, req);
  const { accessToken } = issueTokens(user);

  await emailService.sendTemplate(user.email, 'loginAlert', {
    name: user.profile?.displayName || user.username,
    ip: req.ip,
  });

  await analyticsService.logEvent('LOGIN', { userId: user.id, ipAddress: req.ip });

  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
};

const logout = async (refreshToken) => {
  if (!refreshToken) return;
  await prisma.session.updateMany({
    where: { refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

const refresh = async (refreshToken, req) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }

  const session = await prisma.session.findUnique({
    where: { refreshToken },
    include: { user: { include: { profile: true } } },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new AppError('Session expired', 401, 'SESSION_EXPIRED');
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const { session: newSession, refreshToken: newRefreshToken } = await createSession(
    session.userId,
    req
  );
  const { accessToken } = issueTokens(session.user);

  const { passwordHash: _, ...safeUser } = session.user;
  return { user: safeUser, accessToken, refreshToken: newRefreshToken };
};

const verifyEmail = async (token) => {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true, status: 'ACTIVE' },
    }),
  ]);

  await emailService.sendTemplate(record.user.email, 'welcome', {
    name: record.user.username,
  });

  return { verified: true };
};

const resendVerification = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) {
    return { sent: true };
  }

  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

  const token = generateSecureToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const verifyLink = `${env.frontendUrl}/verify-email?token=${token}`;
  await emailService.sendTemplate(user.email, 'emailVerification', {
    name: user.username,
    link: verifyLink,
  });

  return { sent: true };
};

const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { sent: true };

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = generateSecureToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const resetLink = `${env.frontendUrl}/reset-password?token=${token}`;
  await emailService.sendTemplate(user.email, 'passwordReset', {
    name: user.username,
    link: resetLink,
  });

  return { sent: true };
};

const resetPassword = async (token, newPassword) => {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { reset: true };
};

const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
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
