import { z } from 'zod';

export const upsertBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Mês inválido (use AAAA-MM)'),
  amount: z.number().positive('Valor deve ser positivo'),
});

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;
