const { z } = require('zod');

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  tagline: z.string().max(300).optional(),
  description: z.string().optional(),
  longDescription: z.string().optional(),
  status: z.enum(['ACTIVE', 'BETA', 'DEVELOPMENT', 'ARCHIVED', 'DISCONTINUED']).optional(),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  icon: z.string().optional(),
  coverImage: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  priceGBP: z.number().nonnegative().finite().optional(),
});

const updateProductSchema = createProductSchema.partial();

const createVersionSchema = z.object({
  version: z.string().min(1).max(50),
  releaseDate: z.string().datetime().optional(),
  releaseNotes: z.string().optional(),
  status: z.enum(['DRAFT', 'RELEASED', 'DEPRECATED']).optional(),
  minimumRequirements: z.string().optional(),
  supportedPlatforms: z.array(z.string()).optional(),
});

const updateVersionSchema = createVersionSchema.partial();

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  displayOrder: z.number().int().optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  createVersionSchema,
  updateVersionSchema,
  createCategorySchema,
};
