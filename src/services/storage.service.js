const fs = require('fs');
const path = require('path');
const storageConfig = require('../config/storage');
const cloudinaryService = require('./cloudinary.service');
const { hashChecksum } = require('../utils/encryption');
const logger = require('../utils/logger');

const isCloudinary = () => storageConfig.provider === 'cloudinary' && storageConfig.cloudinaryEnabled;
const isImageUpload = (mimetype) => mimetype?.startsWith('image/');

const upload = async (file, folder = 'uploads') => {
  if (isCloudinary() && isImageUpload(file.mimetype)) {
    return await cloudinaryService.upload(file, folder);
  }

  const storageKey = `${folder}/${file.filename || file.originalname || Date.now()}`;
  const localDir = path.join(storageConfig.localPath || './uploads', folder);
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

  const destPath = path.join(localDir, path.basename(storageKey));
  if (file.path) {
    fs.renameSync(file.path, destPath);
  } else if (file.buffer) {
    fs.writeFileSync(destPath, file.buffer);
  }

  return {
    storageKey,
    fileSize: file.size || 0,
    mimeType: file.mimetype,
    checksum: file.buffer ? hashChecksum(file.buffer) : null,
    provider: 'local',
  };
};

const deleteFile = async (storageKey, provider) => {
  if (provider === 'cloudinary' || isCloudinary()) {
    try {
      await cloudinaryService.deleteFile(storageKey);
      return;
    } catch (err) {
      logger.warn('Cloudinary delete failed', { storageKey, message: err.message });
    }
  }

  const filePath = path.join(storageConfig.localPath || './uploads', storageKey);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};

const getSignedDownloadUrl = async (storageKey, expiresIn = 3600, provider) => {
  if (provider === 'cloudinary' || isCloudinary()) {
    return cloudinaryService.getSignedDownloadUrl(storageKey);
  }
  return `/uploads/${storageKey}`;
};

const getMetadata = async (storageKey, provider) => {
  if (provider === 'cloudinary') {
    return { provider: 'cloudinary', storageKey };
  }
  const filePath = path.join(storageConfig.localPath || './uploads', storageKey);
  if (!fs.existsSync(filePath)) return null;
  const stats = fs.statSync(filePath);
  return { size: stats.size, lastModified: stats.mtime, provider: 'local' };
};

const uploadImage = async (file, folder = 'images') => {
  if (isCloudinary()) {
    return cloudinaryService.upload(file, folder);
  }
  return upload(file, folder);
};

module.exports = {
  upload,
  uploadImage,
  deleteFile,
  getSignedDownloadUrl,
  getMetadata,
  isCloudinary,
};
