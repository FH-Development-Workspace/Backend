const prisma = require('../config/database');
const { sendSuccess } = require('../utils/response');

const getProfile = async (req, res, next) => {
  try {
    const profile = await prisma.companyProfile.findFirst();
    const values = await prisma.companyValue.findMany({ orderBy: { displayOrder: 'asc' } });
    sendSuccess(res, { profile, values });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const existing = await prisma.companyProfile.findFirst();
    let profile;
    if (existing) {
      profile = await prisma.companyProfile.update({ where: { id: existing.id }, data: req.body });
    } else {
      profile = await prisma.companyProfile.create({ data: req.body });
    }
    sendSuccess(res, { profile }, 'Company profile updated');
  } catch (err) {
    next(err);
  }
};

const getTimeline = async (req, res, next) => {
  try {
    const timeline = await prisma.companyTimeline.findMany({ orderBy: { displayOrder: 'asc' } });
    sendSuccess(res, { timeline });
  } catch (err) {
    next(err);
  }
};

const createTimelineEvent = async (req, res, next) => {
  try {
    const data = { ...req.body, eventDate: new Date(req.body.eventDate) };
    const event = await prisma.companyTimeline.create({ data });
    sendSuccess(res, { event }, 'Timeline event created', 201);
  } catch (err) {
    next(err);
  }
};

const createValue = async (req, res, next) => {
  try {
    const value = await prisma.companyValue.create({ data: req.body });
    sendSuccess(res, { value }, 'Value created', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, getTimeline, createTimelineEvent, createValue };
