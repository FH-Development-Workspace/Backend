const prisma = require('../config/database');
const storageService = require('../services/storage.service');
const auditService = require('../services/audit.service');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const where = { productId: req.params.productId, archived: false };
    if (req.params.versionId) where.versionId = req.params.versionId;

    const files = await prisma.productFile.findMany({ where, orderBy: { createdAt: 'desc' } });
    sendSuccess(res, { files });
  } catch (err) {
    next(err);
  }
};

const upload = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE');

    const result = await storageService.upload(req.file, `products/${req.params.productId}`);

    const file = await prisma.productFile.create({
      data: {
        productId: req.params.productId,
        versionId: req.body.versionId || null,
        fileName: req.file.originalname,
        storageKey: result.storageKey,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        checksum: result.checksum,
        visibility: req.body.visibility || 'AUTHENTICATED',
        platform: req.body.platform || null,
      },
    });

    await auditService.log({
      actorId: req.user.id,
      action: 'FILE_UPLOADED',
      resource: 'product_file',
      resourceId: file.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { file }, 'File uploaded', 201);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const file = await prisma.productFile.findUnique({ where: { id: req.params.id } });
    if (!file) throw new AppError('File not found', 404, 'NOT_FOUND');

    await storageService.deleteFile(file.storageKey);
    await prisma.productFile.update({
      where: { id: req.params.id },
      data: { archived: true },
    });

    sendSuccess(res, null, 'File archived');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, upload, remove };
