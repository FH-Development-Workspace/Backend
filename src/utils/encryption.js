const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

const encrypt = (text, secret) => {
  const key = crypto.scryptSync(secret, 'fh-salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

const decrypt = (encryptedText, secret) => {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const key = crypto.scryptSync(secret, 'fh-salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

const hashChecksum = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

module.exports = { encrypt, decrypt, hashChecksum };
