const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const storageConfig = require('../config/storage');
const cloudinaryService = require('./cloudinary.service');
const { hashChecksum } = require('../utils/encryption');
const logger = require('../utils/logger');

let s3Client = null;

const isCloudinary = () => storageConfig.provider === 'cloudinary' && storageConfig.cloudinaryEnabled;
const isImageUpload = (mimetype) => mimetype?.startsWith('image/');

const getS3Client = () => {
  if (!s3Client && !storageConfig.useLocal && storageConfig.endpoint) {
    s3Client = new S3Client({
      endpoint: storageConfig.endpoint,
      region: storageConfig.region,
      credentials: {
        accessKeyId: storageConfig.accessKey,
        secretAccessKey: storageConfig.secretKey,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
};

const upload = async (file, folder = 'uploads') => {
  if (isCloudinary() && isImageUpload(file.mimetype)) {
    const result = await cloudinaryService.upload(file, folder);
    return result;
  }

  const storageKey = `${folder}/${file.filename || file.originalname}`;

  if (storageConfig.useLocal) {
    const localDir = path.join(storageConfig.localPath, folder);
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

    const destPath = path.join(localDir, path.basename(storageKey));
    if (file.path) {
      fs.renameSync(file.path, destPath);
    } else if (file.buffer) {
      fs.writeFileSync(destPath, file.buffer);
    }

    return {
      storageKey,
      fileSize: file.size,
      mimeType: file.mimetype,
      checksum: file.buffer ? hashChecksum(file.buffer) : null,
      provider: 'local',
    };
  }

  const client = getS3Client();
  if (!client) {
    throw new Error('S3 storage is not configured');
  }

  const body = file.buffer || fs.readFileSync(file.path);

  await client.send(
    new PutObjectCommand({
      Bucket: storageConfig.bucket,
      Key: storageKey,
      Body: body,
      ContentType: file.mimetype,
    })
  );

  if (file.path) fs.unlinkSync(file.path);

  return {
    storageKey,
    fileSize: file.size,
    mimeType: file.mimetype,
    checksum: hashChecksum(body),
    provider: 's3',
  };
};

const deleteFile = async (storageKey, provider) => {
  if (provider === 'cloudinary' || storageKey.includes('/')) {
    try {
      await cloudinaryService.deleteFile(storageKey);
      return;
    } catch (err) {
      logger.warn('Cloudinary delete failed, trying other providers', { storageKey });
    }
  }

  if (storageConfig.useLocal) {
    const filePath = path.join(storageConfig.localPath, storageKey);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }

  const client = getS3Client();
  if (!client) return;

  await client.send(
    new DeleteObjectCommand({
      Bucket: storageConfig.bucket,
      Key: storageKey,
    })
  );
};

const getSignedDownloadUrl = async (storageKey, expiresIn = 3600, provider) => {
  if (provider === 'cloudinary') {
    return cloudinaryService.getSignedDownloadUrl(storageKey);
  }

  if (storageConfig.useLocal) {
    const filePath = path.join(storageConfig.localPath, storageKey);
    if (!fs.existsSync(filePath)) throw new Error('File not found');
    return `/uploads/${storageKey}`;
  }

  const client = getS3Client();
  if (!client) throw new Error('Storage not configured');

  const command = new GetObjectCommand({
    Bucket: storageConfig.bucket,
    Key: storageKey,
  });
  return getSignedUrl(client, command, { expiresIn });
};

const getMetadata = async (storageKey, provider) => {
  if (provider === 'cloudinary') {
    return { provider: 'cloudinary', storageKey };
  }

  if (storageConfig.useLocal) {
    const filePath = path.join(storageConfig.localPath, storageKey);
    if (!fs.existsSync(filePath)) return null;
    const stats = fs.statSync(filePath);
    return { size: stats.size, lastModified: stats.mtime, provider: 'local' };
  }

  const client = getS3Client();
  if (!client) return null;

  const result = await client.send(
    new HeadObjectCommand({
      Bucket: storageConfig.bucket,
      Key: storageKey,
    })
  );
  return { size: result.ContentLength, lastModified: result.LastModified, contentType: result.ContentType, provider: 's3' };
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
