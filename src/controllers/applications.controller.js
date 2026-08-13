const prisma = require('../config/database');
const storageService = require('../services/storage.service');
const emailService = require('../services/email.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const apply = async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job || job.status !== 'PUBLISHED') {
      throw new AppError('Job not available', 404, 'NOT_FOUND');
    }

    let resumeKey = null;
    if (req.file) {
      const uploaded = await storageService.upload(req.file, `applications/${job.id}`);
      resumeKey = uploaded.storageKey;
    }

    const application = await prisma.jobApplication.create({
      data: {
        jobId: job.id,
        userId: req.user?.id || null,
        ...req.body,
        resumeKey,
      },
    });

    await prisma.applicationStatusHistory.create({
      data: { applicationId: application.id, toStatus: 'NEW' },
    });

    await emailService.sendTemplate(req.body.email, 'applicationReceived', {
      name: `${req.body.firstName} ${req.body.lastName}`,
      jobTitle: job.title,
    });

    sendSuccess(res, { id: application.id }, 'Application submitted', 201);
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = {};
    if (req.query.jobId) where.jobId = req.query.jobId;
    if (req.query.status) where.status = req.query.status;

    const [items, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        include: {
          job: { select: { id: true, title: true, slug: true } },
          history: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.jobApplication.count({ where }),
    ]);

    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const application = await prisma.jobApplication.findUnique({
      where: { id: req.params.id },
      include: {
        job: true,
        history: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!application) throw new AppError('Application not found', 404, 'NOT_FOUND');
    sendSuccess(res, { application });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const current = await prisma.jobApplication.findUnique({ where: { id: req.params.id } });
    if (!current) throw new AppError('Application not found', 404, 'NOT_FOUND');

    const application = await prisma.jobApplication.update({
      where: { id: req.params.id },
      data: { status: req.body.status, notes: req.body.notes },
    });

    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        fromStatus: current.status,
        toStatus: req.body.status,
        changedBy: req.user.id,
        notes: req.body.notes,
      },
    });

    sendSuccess(res, { application }, 'Application updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { apply, list, getById, updateStatus };
