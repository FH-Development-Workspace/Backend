const { z } = require('zod');

const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(10000),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  category: z.string().max(100).optional(),
});

const replySchema = z.object({
  content: z.string().min(1).max(10000),
  isInternal: z.boolean().optional(),
});

const updateTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  category: z.string().max(100).optional(),
});

const assignSchema = z.object({
  assigneeId: z.string().uuid(),
  notes: z.string().optional(),
});

module.exports = {
  createTicketSchema,
  replySchema,
  updateTicketSchema,
  assignSchema,
};
