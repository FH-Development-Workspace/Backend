const prisma = require('../config/database');
const { generateLicenseKey } = require('../utils/tokens');
const emailService = require('./email.service');
const notificationService = require('./notification.service');
const auditService = require('./audit.service');
const analyticsService = require('./analytics.service');
const { AppError } = require('../middleware/error.middleware');

const createLicense = async (data, actorId, req) => {
  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  let licenseKey;
  let attempts = 0;
  do {
    licenseKey = generateLicenseKey();
    attempts++;
  } while (await prisma.license.findUnique({ where: { licenseKey } }) && attempts < 10);

  const license = await prisma.license.create({
    data: {
      licenseKey,
      productId: data.productId,
      userId: data.userId,
      type: data.type || 'PERSONAL',
      status: 'ACTIVE',
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      activationLimit: data.activationLimit || 1,
      notes: data.notes,
    },
    include: {
      product: { select: { name: true, slug: true } },
      user: { select: { id: true, email: true, username: true } },
    },
  });

  await prisma.licenseEvent.create({
    data: { licenseId: license.id, event: 'CREATED', metadata: { actorId } },
  });

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
    data: { licenseId: license.id },
  });

  return license;
};

const activateLicense = async (licenseKey, machineId, machineName, req) => {
  const license = await prisma.license.findUnique({
    where: { licenseKey },
    include: { product: true },
  });

  if (!license) throw new AppError('Invalid license key', 404, 'NOT_FOUND');
  if (license.status !== 'ACTIVE') {
    throw new AppError(`License is ${license.status.toLowerCase()}`, 403, 'LICENSE_INACTIVE');
  }
  if (license.expiresAt && license.expiresAt < new Date()) {
    await prisma.license.update({ where: { id: license.id }, data: { status: 'EXPIRED' } });
    throw new AppError('License has expired', 403, 'LICENSE_EXPIRED');
  }
  if (license.activationCount >= license.activationLimit) {
    throw new AppError('Activation limit reached', 403, 'ACTIVATION_LIMIT');
  }

  const existing = await prisma.licenseActivation.findFirst({
    where: { licenseId: license.id, machineId, isActive: true },
  });
  if (existing) {
    return { activation: existing, license };
  }

  const activation = await prisma.licenseActivation.create({
    data: {
      licenseId: license.id,
      machineId,
      machineName,
      ipAddress: req?.ip,
    },
  });

  await prisma.license.update({
    where: { id: license.id },
    data: { activationCount: { increment: 1 } },
  });

  await prisma.licenseEvent.create({
    data: {
      licenseId: license.id,
      event: 'ACTIVATED',
      metadata: { machineId, machineName },
    },
  });

  await analyticsService.logEvent('LICENSE_EVENT', {
    userId: license.userId,
    resource: 'license',
    resourceId: license.id,
    metadata: { event: 'ACTIVATED' },
  });

  return { activation, license };
};

const deactivateLicense = async (licenseKey, machineId, userId) => {
  const license = await prisma.license.findUnique({ where: { licenseKey } });
  if (!license) throw new AppError('Invalid license key', 404, 'NOT_FOUND');
  if (license.userId !== userId) throw new AppError('Access denied', 403, 'FORBIDDEN');

  const activation = await prisma.licenseActivation.findFirst({
    where: { licenseId: license.id, machineId, isActive: true },
  });
  if (!activation) throw new AppError('Activation not found', 404, 'NOT_FOUND');

  await prisma.licenseActivation.update({
    where: { id: activation.id },
    data: { isActive: false, deactivatedAt: new Date() },
  });

  await prisma.license.update({
    where: { id: license.id },
    data: { activationCount: { decrement: 1 } },
  });

  await prisma.licenseEvent.create({
    data: { licenseId: license.id, event: 'DEACTIVATED', metadata: { machineId } },
  });

  return { deactivated: true };
};

const revokeLicense = async (licenseId, actorId, req) => {
  const license = await prisma.license.update({
    where: { id: licenseId },
    data: { status: 'REVOKED' },
  });

  await prisma.licenseEvent.create({
    data: { licenseId, event: 'REVOKED', metadata: { actorId } },
  });

  await auditService.log({
    actorId,
    action: 'LICENSE_REVOKED',
    resource: 'license',
    resourceId: licenseId,
    ipAddress: req?.ip,
  });

  return license;
};

const renewLicense = async (licenseId, expiresAt, actorId) => {
  const license = await prisma.license.update({
    where: { id: licenseId },
    data: {
      expiresAt: new Date(expiresAt),
      status: 'ACTIVE',
    },
  });

  await prisma.licenseEvent.create({
    data: { licenseId, event: 'RENEWED', metadata: { actorId, expiresAt } },
  });

  return license;
};

const getUserLicenses = async (userId, { skip, limit }) => {
  const [items, total] = await Promise.all([
    prisma.license.findMany({
      where: { userId, deletedAt: null },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        activations: { where: { isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.license.count({ where: { userId, deletedAt: null } }),
  ]);

  return { items, total };
};

module.exports = {
  createLicense,
  activateLicense,
  deactivateLicense,
  revokeLicense,
  renewLicense,
  getUserLicenses,
};
