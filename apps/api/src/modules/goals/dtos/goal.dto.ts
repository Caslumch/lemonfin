import { z } from 'zod';

export const createGoalSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  amount: z.number().positive('Valor deve ser positivo'),
  period: z.enum(['MONTHLY', 'WEEKLY']).default('MONTHLY'),
  categoryId: z.string().cuid(),
});

export const updateGoalSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().positive('Valor deve ser positivo').optional(),
  period: z.enum(['MONTHLY', 'WEEKLY']).optional(),
  active: z.boolean().optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
