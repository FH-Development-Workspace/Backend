const { z } = require('zod');

const contentEntrySchema = z.object({
  type: z.enum(['press', 'events', 'community', 'sponsorships', 'features', 'announcements']),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: z.string().max(2000).optional(),
  body: z.string().max(50000).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  published: z.boolean().optional(),
  publishedAt: z.string().datetime().optional(),
});

const contentEntryUpdateSchema = contentEntrySchema.partial().omit({ type: true });

module.exports = { contentEntrySchema, contentEntryUpdateSchema };