const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const storageConfig = require('../config/storage');

const ALLOWED_MIMES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  archive: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
  all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
};

const ensureUploadDir = () => {
  const dir = storageConfig.localPath;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ensureUploadDir());
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${crypto.randomUUID()}${ext}`;
    cb(null, safeName);
  },
});

const createUploadMiddleware = (options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024,
    allowedMimes = ALLOWED_MIMES.all,
    fieldName = 'file',
  } = options;

  const upload = multer({
    storage: diskStorage,
    limits: { fileSize: maxSize },
    fileFilter: (req, file, cb) => {
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed`));
      }
    },
  });

  return upload.single(fieldName);
};

module.exports = { createUploadMiddleware, ALLOWED_MIMES };
