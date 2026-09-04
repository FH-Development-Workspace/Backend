const crypto = require('crypto');
const prisma = require('../config/database');
const { AppError } = require('../middleware/error.middleware');
const { sendSuccess } = require('../utils/response');

const hashEmail = (email) => crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
const isActive = (entry) => entry.active && (entry.permanent || !entry.expiresAt || entry.expiresAt > new Date());

const check = async (req, res, next) => {
  try {
    const where = req.query.robloxUserId
      ? { robloxUserId: String(req.query.robloxUserId) }
      : req.query.email ? { emailHash: hashEmail(String(req.query.email)) } : null;
    if (!where) throw new AppError('robloxUserId or email is required', 422, 'VALIDATION_ERROR');
    const entry = await prisma.blacklistEntry.findFirst({ where });
    sendSuccess(res, { blacklisted: Boolean(entry && isActive(entry)) });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const entries = await prisma.blacklistEntry.findMany({ orderBy: { createdAt: 'desc' } });
    sendSuccess(res, { entries });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = {
      robloxUserId: req.body.robloxUserId,
      emailHash: req.body.email ? hashEmail(req.body.email) : undefined,
      reason: req.body.reason,
      permanent: req.body.permanent ?? !req.body.expiresAt,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      createdBy: req.user.id,
    };
    const entry = await prisma.blacklistEntry.create({ data });
    sendSuccess(res, { entry }, 'Blacklist entry created', 201);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const entry = await prisma.blacklistEntry.update({ where: { id: req.params.id }, data: { active: false } });
    sendSuccess(res, { entry }, 'Blacklist entry removed');
  } catch (err) { next(err); }
};

module.exports = { check, list, create, remove };