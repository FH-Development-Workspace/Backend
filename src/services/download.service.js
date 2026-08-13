const prisma = require('../config/database');
const storageService = require('./storage.service');
const emailService = require('./email.service');
const analyticsService = require('./analytics.service');
const { AppError } = require('../middleware/error.middleware');

const generateReceiptNumber = async () => {
  const year = new Date().getFullYear();
  const counter = await prisma.receiptCounter.upsert({
    where: { year },
    create: { year, counter: 1 },
    update: { counter: { increment: 1 } },
  });
  return `FH-${year}-${String(counter.counter).padStart(6, '0')}`;
};

const checkDownloadPermission = async (userId, file) => {
  if (file.visibility === 'PUBLIC') return true;
  if (file.visibility === 'AUTHENTICATED' && userId) return true;

  if (file.visibility === 'LICENSED') {
    const license = await prisma.license.findFirst({
      where: {
        userId,
        productId: file.productId,
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (!license) {
      throw new AppError('Valid license required for this download', 403, 'LICENSE_REQUIRED');
    }
  }

  return true;
};

const requestDownload = async (userId, fileId, req) => {
  const file = await prisma.productFile.findUnique({
    where: { id: fileId },
    include: {
      product: true,
      version: true,
    },
  });

  if (!file || file.archived) {
    throw new AppError('File not found', 404, 'NOT_FOUND');
  }

  await checkDownloadPermission(userId, file);

  const download = await prisma.download.create({
    data: {
      userId,
      productId: file.productId,
      versionId: file.versionId,
      fileId: file.id,
      status: 'COMPLETED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });

  const receiptNumber = await generateReceiptNumber();
  const receipt = await prisma.downloadReceipt.create({
    data: {
      receiptNumber,
      userId,
      downloadId: download.id,
      productId: file.productId,
      versionId: file.versionId,
      fileId: file.id,
      status: 'COMPLETED',
    },
  });

  const signedUrl = await storageService.getSignedDownloadUrl(file.storageKey);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  await emailService.sendTemplate(user.email, 'downloadReceipt', {
    name: user.profile?.displayName || user.username,
    receiptNumber,
    productName: file.product.name,
  });

  await analyticsService.logEvent('DOWNLOAD', {
    userId,
    resource: 'product',
    resourceId: file.productId,
    ipAddress: req.ip,
  });

  return {
    download,
    receipt,
    url: signedUrl,
    expiresIn: 3600,
  };
};

const getProductDownloads = async (slug) => {
  const product = await prisma.product.findUnique({
    where: { slug, published: true, deletedAt: null },
    include: {
      versions: {
        where: { status: 'RELEASED' },
        include: {
          files: { where: { archived: false, visibility: { in: ['PUBLIC', 'AUTHENTICATED'] } } },
        },
        orderBy: { releaseDate: 'desc' },
      },
    },
  });

  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  return product.versions.map((v) => ({
    version: v.version,
    releaseDate: v.releaseDate,
    releaseNotes: v.releaseNotes,
    files: v.files.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      fileSize: f.fileSize,
      mimeType: f.mimeType,
      platform: f.platform,
      visibility: f.visibility,
    })),
  }));
};

const getUserDownloads = async (userId, { skip, limit }) => {
  const [items, total] = await Promise.all([
    prisma.download.findMany({
      where: { userId },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        file: { select: { id: true, fileName: true, fileSize: true } },
        receipt: { select: { receiptNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.download.count({ where: { userId } }),
  ]);

  return { items, total };
};

const getReceipt = async (downloadId, userId, isStaff = false) => {
  const download = await prisma.download.findUnique({
    where: { id: downloadId },
    include: {
      receipt: true,
      product: { select: { name: true, slug: true } },
      file: { select: { fileName: true, fileSize: true } },
      version: { select: { version: true } },
    },
  });

  if (!download) throw new AppError('Download not found', 404, 'NOT_FOUND');
  if (!isStaff && download.userId !== userId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  return download;
};

module.exports = {
  requestDownload,
  getProductDownloads,
  getUserDownloads,
  getReceipt,
  checkDownloadPermission,
};
