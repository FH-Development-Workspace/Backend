const { Router } = require('express');
const storageService = require('../services/storage.service');
const cloudinaryService = require('../services/cloudinary.service');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { createUploadMiddleware } = require('../middleware/upload.middleware');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const router = Router();

router.post(
  '/upload',
  authenticate,
  requirePermission('PRODUCT_EDIT'),
  createUploadMiddleware({ maxSize: 10 * 1024 * 1024 }),
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE');

      const folder = req.body.folder || 'images';
      const result = storageService.isCloudinary()
        ? await cloudinaryService.upload(req.file, folder)
        : await storageService.uploadImage(req.file, folder);

      sendSuccess(res, { file: result }, 'File uploaded', 201);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/url', authenticate, (req, res, next) => {
  try {
    const { publicId, w, h, crop } = req.query;
    if (!publicId) throw new AppError('publicId query param required', 400, 'VALIDATION_ERROR');
    const url = cloudinaryService.getUrl(publicId, {
      width: w ? parseInt(w, 10) : undefined,
      height: h ? parseInt(h, 10) : undefined,
      crop: crop || 'auto',
    });
    sendSuccess(res, { url });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
