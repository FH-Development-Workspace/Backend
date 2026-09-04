const { z } = require('zod');

const updateProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  displayName: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  phone: z.string().max(20).optional(),
  company: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
});

const updateAccountSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(30).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1),
});

const createUserSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING']).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8).optional(),
});

module.exports = {
  updateProfileSchema,
  updateAccountSchema,
  changePasswordSchema,
  deleteAccountSchema,
  createUserSchema,
  updateUserSchema,
};
