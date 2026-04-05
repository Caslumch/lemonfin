import { z } from 'zod';

export const createCardSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  brand: z.string().optional(),
  limit: z.number().positive('Limite deve ser positivo').optional(),
  closingDay: z.number().int().min(1).max(31, 'Dia de fechamento deve ser entre 1 e 31'),
  dueDay: z.number().int().min(1).max(31, 'Dia de vencimento deve ser entre 1 e 31').optional(),
});

export const updateCardSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().optional(),
  limit: z.number().positive().optional(),
  closingDay: z.number().int().min(1).max(31).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
