import { z } from 'zod';

export const createRecurringSchema = z.object({
  description: z.string().min(1, 'Descricao e obrigatoria'),
  amount: z.number().positive('Valor deve ser positivo'),
  type: z.enum(['INCOME', 'EXPENSE']),
  dayOfMonth: z.number().int().min(1).max(31),
  categoryId: z.string().cuid(),
  cardId: z.string().cuid().optional(),
});

export const updateRecurringSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().positive('Valor deve ser positivo').optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  categoryId: z.string().cuid().optional(),
  cardId: z.string().cuid().nullable().optional(),
  active: z.boolean().optional(),
});

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
