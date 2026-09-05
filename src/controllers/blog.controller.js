const { query } = require('../config/database');
const auditService = require('../services/audit.service');
const analyticsService = require('../services/analytics.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

const formatPost = (p) => ({
  id: p.id,
  title: p.title,
  slug: p.slug,
  excerpt: p.excerpt,
  content: p.content,
  coverImage: p.cover_image,
  status: p.status,
  publishedAt: p.published_at,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
  author: p.author_username ? {
    id: p.author_id,
    username: p.author_username,
  } : null,
  category: p.category_name ? {
    id: p.category_id,
    name: p.category_name,
    slug: p.category_slug,
  } : null,
});

const list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    let whereClauses = [];
    let params = [];

    const canViewDrafts = req.userPermissions?.includes('BLOG_VIEW');
    if (!canViewDrafts) {
      whereClauses.push("bp.status = 'PUBLISHED'");
    } else if (req.query.status) {
      params.push(req.query.status);
      whereClauses.push(`bp.status = $${params.length}`);
    }

    if (req.query.category) {
      params.push(req.query.category);
      whereClauses.push(`bc.slug = $${params.length}`);
    }

    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      whereClauses.push(`(bp.title ILIKE $${params.length} OR bp.excerpt ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await query(`
      SELECT COUNT(*) FROM blog_posts bp
      LEFT JOIN blog_categories bc ON bp.category_id = bc.id
      ${whereSql}
    `, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const listParams = [...params, limit, skip];
    const itemsRes = await query(`
      SELECT bp.*, u.username as author_username, bc.name as category_name, bc.slug as category_slug
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      LEFT JOIN blog_categories bc ON bp.category_id = bc.id
      ${whereSql}
      ORDER BY bp.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, listParams);

    sendPaginated(res, itemsRes.rows.map(formatPost), buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

const getBySlug = async (req, res, next) => {
  try {
    const resPost = await query(`
      SELECT bp.*, u.username as author_username, bc.name as category_name, bc.slug as category_slug
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      LEFT JOIN blog_categories bc ON bp.category_id = bc.id
      WHERE bp.slug = $1
    `, [req.params.slug]);

    if (!resPost.rows.length) throw new AppError('Blog post not found', 404, 'NOT_FOUND');
    const post = formatPost(resPost.rows[0]);

    sendSuccess(res, { post });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { title, excerpt, content, coverImage, status, categoryId } = req.body;
    const slug = (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'post-' + Date.now();

    const postRes = await query(`
      INSERT INTO blog_posts (author_id, category_id, title, slug, excerpt, content, cover_image, status, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'DRAFT'), CASE WHEN $8 = 'PUBLISHED' THEN NOW() ELSE NULL END)
      RETURNING *
    `, [req.user.id, categoryId || null, title, slug, excerpt || null, content, coverImage || null, status || 'DRAFT']);

    sendSuccess(res, { post: formatPost(postRes.rows[0]) }, 'Post created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { title, excerpt, content, coverImage, status, categoryId } = req.body;
    const postRes = await query(`
      UPDATE blog_posts
      SET category_id = COALESCE($1, category_id),
          title = COALESCE($2, title),
          excerpt = COALESCE($3, excerpt),
          content = COALESCE($4, content),
          cover_image = COALESCE($5, cover_image),
          status = COALESCE($6, status),
          published_at = CASE WHEN $6 = 'PUBLISHED' THEN NOW() ELSE published_at END,
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [categoryId, title, excerpt, content, coverImage, status, req.params.id]);

    if (!postRes.rows.length) throw new AppError('Post not found', 404, 'NOT_FOUND');
    sendSuccess(res, { post: formatPost(postRes.rows[0]) }, 'Post updated');
  } catch (err) {
    next(err);
  }
};

const publish = async (req, res, next) => {
  try {
    const postRes = await query("UPDATE blog_posts SET status = 'PUBLISHED', published_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *", [req.params.id]);
    if (!postRes.rows.length) throw new AppError('Post not found', 404, 'NOT_FOUND');
    sendSuccess(res, { post: formatPost(postRes.rows[0]) }, 'Post published');
  } catch (err) {
    next(err);
  }
};

const unpublish = async (req, res, next) => {
  try {
    const postRes = await query("UPDATE blog_posts SET status = 'DRAFT', updated_at = NOW() WHERE id = $1 RETURNING *", [req.params.id]);
    if (!postRes.rows.length) throw new AppError('Post not found', 404, 'NOT_FOUND');
    sendSuccess(res, { post: formatPost(postRes.rows[0]) }, 'Post unpublished');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM blog_posts WHERE id = $1', [req.params.id]);
    sendSuccess(res, null, 'Post deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getBySlug, create, update, publish, unpublish, remove };
