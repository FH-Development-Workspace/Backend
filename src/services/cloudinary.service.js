const { v2: cloudinary } = require('cloudinary');
const cloudinaryConfig = require('../config/cloudinary');
const logger = require('../utils/logger');

let configured = false;

const configure = () => {
  if (configured) return;

  if (cloudinaryConfig.url) {
    cloudinary.config({ secure: true });
    process.env.CLOUDINARY_URL = cloudinaryConfig.url;
  } else if (cloudinaryConfig.cloudName && cloudinaryConfig.apiKey && cloudinaryConfig.apiSecret) {
    cloudinary.config({
      cloud_name: cloudinaryConfig.cloudName,
      api_key: cloudinaryConfig.apiKey,
      api_secret: cloudinaryConfig.apiSecret,
      secure: true,
    });
  } else {
    return false;
  }

  configured = true;
  return true;
};

const upload = async (file, folder = 'uploads') => {
  if (!configure()) {
    throw new Error('Cloudinary is not configured');
  }

  const publicFolder = `${cloudinaryConfig.folder}/${folder}`;
  const filePath = file.path;
  const buffer = file.buffer;

  const options = {
    folder: publicFolder,
    resource_type: 'auto',
    use_filename: true,
    unique_filename: true,
  };

  let result;
  if (buffer) {
    result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
      stream.end(buffer);
    });
  } else if (filePath) {
    result = await cloudinary.uploader.upload(filePath, options);
  } else {
    throw new Error('No file data provided for Cloudinary upload');
  }

  logger.info('Cloudinary upload complete', { publicId: result.public_id });

  return {
    storageKey: result.public_id,
    url: result.secure_url,
    fileSize: result.bytes,
    mimeType: file.mimetype || result.resource_type,
    checksum: result.etag,
    provider: 'cloudinary',
  };
};

const deleteFile = async (publicId) => {
  if (!configure()) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
};

const getUrl = (publicId, options = {}) => {
  if (!configure()) return null;
  return cloudinary.url(publicId, {
    secure: true,
    fetch_format: 'auto',
    quality: 'auto',
    ...options,
  });
};

const getSignedDownloadUrl = async (publicId) => {
  return getUrl(publicId);
};

module.exports = {
  configure,
  upload,
  deleteFile,
  getUrl,
  getSignedDownloadUrl,
};
