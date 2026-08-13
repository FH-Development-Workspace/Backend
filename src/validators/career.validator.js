const { z } = require('zod');

const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  requirements: z.string().optional(),
  benefits: z.string().optional(),
  location: z.string().max(200).optional(),
  type: z.string().max(50).optional(),
  salary: z.string().max(100).optional(),
  departmentId: z.string().uuid().optional().nullable(),
  closesAt: z.string().datetime().optional(),
});

const updateJobSchema = createJobSchema.partial().extend({
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
});

const applyJobSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  coverLetter: z.string().max(10000).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
});

const updateApplicationSchema = z.object({
  status: z.enum(['NEW', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'REJECTED', 'HIRED']),
  notes: z.string().optional(),
});

module.exports = {
  createJobSchema,
  updateJobSchema,
  applyJobSchema,
  updateApplicationSchema,
};
