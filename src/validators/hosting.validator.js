const { z } = require('zod');

const hostingRequestSchema = z.object({
  planId: z.string().uuid(),
  email: z.string().email().optional(),
});

module.exports = { hostingRequestSchema };