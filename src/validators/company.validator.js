const { z } = require('zod');

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
  inquiryType: z.string().max(50).optional(),
});

const updateCompanyProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  tagline: z.string().max(300).optional(),
  description: z.string().optional(),
  mission: z.string().optional(),
  vision: z.string().optional(),
  foundedYear: z.number().int().optional(),
  headquarters: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  website: z.string().url().optional().or(z.literal('')),
  logo: z.string().optional(),
});

const createPartnerSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  logo: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  displayOrder: z.number().int().optional(),
  published: z.boolean().optional(),
});

const createRoadmapItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  category: z.string().max(100).optional(),
  targetPeriod: z.string().max(50).optional(),
  isPublic: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  productId: z.string().uuid().optional().nullable(),
});

const createTeamMemberSchema = z.object({
  name: z.string().min(1).max(100),
  position: z.string().min(1).max(100),
  bio: z.string().optional(),
  profileImage: z.string().optional(),
  socialLinks: z.record(z.string()).optional(),
  displayOrder: z.number().int().optional(),
  published: z.boolean().optional(),
  department: z.string().max(100).optional(),
});

module.exports = {
  contactSchema,
  updateCompanyProfileSchema,
  createPartnerSchema,
  createRoadmapItemSchema,
  createTeamMemberSchema,
};
