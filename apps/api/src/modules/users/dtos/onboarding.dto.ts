import { z } from 'zod';

export const onboardingSchema = z.object({
  // Renda mensal → vira recorrência de receita (salário) no dia informado.
  income: z
    .object({
      amount: z.number().positive(),
      dayOfMonth: z.number().int().min(1).max(31),
    })
    .optional(),
  // Contas fixas → recorrências de despesa.
  fixedExpenses: z
    .array(
      z.object({
        description: z.string().min(1),
        amount: z.number().positive(),
        dayOfMonth: z.number().int().min(1).max(31),
        categorySlug: z.string().min(1),
      }),
    )
    .default([]),
  // Orçamento do mês atual.
  budgetAmount: z.number().positive().optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
