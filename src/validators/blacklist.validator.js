const { z } = require('zod');

const createBlacklistSchema = z.object({
  robloxUserId: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  reason: z.string().min(1).max(500),
  permanent: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
}).refine((value) => value.robloxUserId || value.email, { message: 'robloxUserId or email is required' });

module.exports = { createBlacklistSchema };