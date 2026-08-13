const prisma = require('../config/database');
const { createUniqueSlug } = require('../utils/slug');
const auditService = require('../services/audit.service');
const analyticsService = require('../services/analytics.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { deletedAt: null };
    if (req.query.published === 'true' || !req.userPermissions?.includes('BLOG_VIEW')) {
      where.status = 'PUBLISHED';
    }
    if (req.query.category) where.category = { slug: req.query.category };

    const [items, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: {
          category: true,
          author: true,
          tags: { include: { tag: true } },
        },
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.blogPost.count({ where }),
    ]);

    sendPaginated(res, items, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getBySlug = async (req, res, next) => {
  try {
    const where = { slug: req.params.slug, deletedAt: null };
    if (!req.userPermissions?.includes('BLOG_VIEW')) where.status = 'PUBLISHED';

    const post = await prisma.blogPost.findFirst({
      where,
      include: { category: true, author: true, tags: { include: { tag: true } } },
    });
    if (!post) throw new AppError('Post not found', 404, 'NOT_FOUND');

    await analyticsService.logEvent('BLOG_VIEW', {
      userId: req.user?.id,
      resource: 'blog',
      resourceId: post.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { post });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { tagIds, ...data } = req.body;
    const slug = await createUniqueSlug(data.title, prisma.blogPost);

    const post = await prisma.blogPost.create({
      data: {
        ...data,
        slug,
        authorUserId: req.user.id,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    });

    if (tagIds?.length) {
      await prisma.blogPostTag.createMany({
        data: tagIds.map((tagId) => ({ postId: post.id, tagId })),
      });
    }

    sendSuccess(res, { post }, 'Post created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { tagIds, ...data } = req.body;
    if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt);

    const post = await prisma.blogPost.update({ where: { id: req.params.id }, data });

    if (tagIds) {
      await prisma.blogPostTag.deleteMany({ where: { postId: post.id } });
      if (tagIds.length) {
        await prisma.blogPostTag.createMany({
          data: tagIds.map((tagId) => ({ postId: post.id, tagId })),
        });
      }
    }

    sendSuccess(res, { post }, 'Post updated');
  } catch (err) {
    next(err);
  }
};

const publish = async (req, res, next) => {
  try {
    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    await auditService.log({
      actorId: req.user.id,
      action: 'BLOG_PUBLISHED',
      resource: 'blog',
      resourceId: post.id,
      ipAddress: req.ip,
    });

    sendSuccess(res, { post }, 'Post published');
  } catch (err) {
    next(err);
  }
};

const unpublish = async (req, res, next) => {
  try {
    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: { status: 'DRAFT' },
    });
    sendSuccess(res, { post }, 'Post unpublished');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await prisma.blogPost.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), deletedBy: req.user.id },
    });
    sendSuccess(res, null, 'Post deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getBySlug, create, update, publish, unpublish, remove };
