import { z } from 'zod';

// Ajuste de dia útil: quando o dia da recorrência cai em fim de semana ou
// feriado nacional. Default EXACT preserva o comportamento anterior.
export const businessDayAdjustmentSchema = z.enum([
  'EXACT',
  'PREVIOUS',
  'NEXT',
]);

export const createRecurringSchema = z.object({
  description: z.string().min(1, 'Descricao e obrigatoria'),
  amount: z.number().positive('Valor deve ser positivo'),
  type: z.enum(['INCOME', 'EXPENSE']),
  dayOfMonth: z.number().int().min(1).max(31),
  businessDayAdjustment: businessDayAdjustmentSchema.default('EXACT'),
  categoryId: z.string().cuid(),
  cardId: z.string().cuid().optional(),
});

export const updateRecurringSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().positive('Valor deve ser positivo').optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  businessDayAdjustment: businessDayAdjustmentSchema.optional(),
  categoryId: z.string().cuid().optional(),
  cardId: z.string().cuid().nullable().optional(),
  active: z.boolean().optional(),
});

export const listRecurringQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  // Quando informado, restringe a um único membro da família (validado no use-case).
  memberId: z.string().cuid().optional(),
});

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
export type ListRecurringQuery = z.infer<typeof listRecurringQuerySchema>;
