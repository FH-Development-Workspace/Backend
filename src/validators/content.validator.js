const { z } = require('zod');

const createBlogPostSchema = z.object({
  title: z.string().min(1).max(300),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).optional(),
  featured: z.boolean().optional(),
  featuredImage: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  authorId: z.string().uuid().optional().nullable(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  scheduledAt: z.string().datetime().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

const updateBlogPostSchema = createBlogPostSchema.partial();

const createDocArticleSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1),
  categoryId: z.string().uuid().optional().nullable(),
  displayOrder: z.number().int().optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).optional(),
});

const createFaqSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1),
  categoryId: z.string().uuid().optional().nullable(),
  displayOrder: z.number().int().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).optional(),
});

const createReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  content: z.string().min(10).max(5000),
});

const createChangelogReleaseSchema = z.object({
  version: z.string().min(1).max(50),
  title: z.string().max(200).optional(),
  releaseDate: z.string().datetime().optional(),
  items: z.array(z.object({
    type: z.enum(['NEW', 'IMPROVED', 'FIXED', 'SECURITY', 'BREAKING']),
    title: z.string().min(1),
    description: z.string().optional(),
  })).optional(),
});

module.exports = {
  createBlogPostSchema,
  updateBlogPostSchema,
  createDocArticleSchema,
  createFaqSchema,
  createReviewSchema,
  createChangelogReleaseSchema,
};
