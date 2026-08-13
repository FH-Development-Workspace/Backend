const { z } = require('zod');

const createLicenseSchema = z.object({
  productId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['TRIAL', 'PERSONAL', 'COMMERCIAL', 'ENTERPRISE', 'LIFETIME']).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  activationLimit: z.number().int().min(1).max(100).optional(),
  notes: z.string().optional(),
});

const activateLicenseSchema = z.object({
  licenseKey: z.string().min(1),
  machineId: z.string().min(1).max(200),
  machineName: z.string().max(200).optional(),
});

const deactivateLicenseSchema = z.object({
  licenseKey: z.string().min(1),
  machineId: z.string().min(1),
});

const renewLicenseSchema = z.object({
  expiresAt: z.string().datetime(),
});

module.exports = {
  createLicenseSchema,
  activateLicenseSchema,
  deactivateLicenseSchema,
  renewLicenseSchema,
};
