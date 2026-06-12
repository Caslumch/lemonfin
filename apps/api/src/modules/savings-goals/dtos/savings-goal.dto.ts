import { z } from 'zod';

export const createSavingsGoalSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  targetAmount: z.number().positive('Valor deve ser positivo'),
  // Aceita string ISO ou Date; precisa ser no futuro.
  deadline: z.coerce.date().refine((d) => d.getTime() > Date.now(), {
    message: 'Prazo deve ser no futuro',
  }),
});

export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;
