const { z } = require('zod');

const hostingRequestSchema = z.object({
  planId: z.string().uuid('planId must be a valid UUID'),
  serviceName: z.string().min(2, 'serviceName must be at least 2 characters').max(100),
  email: z.string().email().optional(),
  discordUsername: z.string().optional(),
  runtime: z.enum(['Python', 'JavaScript', 'Other']).optional(),
  projectDescription: z.string().max(2000).optional(),
  expectedWorkload: z.string().max(500).optional(),
  modMailRequired: z.boolean().optional(),
  databaseRequired: z.boolean().optional(),
  additionalRequirements: z.string().max(2000).optional(),
  repoUrl: z.string().url().optional().or(z.literal('')),
  environmentNotes: z.string().max(2000).optional(),
  additionalNotes: z.string().max(2000).optional(),
  softwareStack: z.string().max(200).optional(),
  environmentVariables: z.record(z.string()).optional(),
});

module.exports = { hostingRequestSchema };