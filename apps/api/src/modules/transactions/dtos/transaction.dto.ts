import { z } from 'zod';

export const createTransactionSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo'),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
  categoryId: z.string().cuid(),
  cardId: z.string().cuid().optional(),
  // Parcelamento: quando >= 2, `amount` é o valor TOTAL da compra e o backend
  // cria N parcelas (uma por mês a partir de `date`). Ausente/1 = transação
  // avulsa. Só vale para EXPENSE (validado no use-case).
  installments: z.number().int().min(2).max(48).optional(),
});

export const updateTransactionSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo').optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
  categoryId: z.string().cuid().optional(),
  cardId: z.string().cuid().nullable().optional(),
});

// Edição de uma compra parcelada inteira (scope=group). `amount` é o valor
// TOTAL da compra (será redividido), `installments` o novo nº de parcelas e
// `date` a data da 1ª parcela — o backend apaga as parcelas atuais e recria o
// grupo (preservando o installmentGroupId). Sempre EXPENSE.
export const updateInstallmentGroupSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo'),
  description: z.string().optional(),
  date: z.string().datetime(),
  categoryId: z.string().cuid(),
  cardId: z.string().cuid().nullable().optional(),
  installments: z.number().int().min(2).max(48),
});

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  categoryId: z.string().cuid().optional(),
  search: z.string().trim().min(1).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  // Quando informado, restringe a listagem a um único membro da família.
  // Validado no use-case (precisa pertencer à família do solicitante).
  memberId: z.string().cuid().optional(),
  orderBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type UpdateInstallmentGroupInput = z.infer<
  typeof updateInstallmentGroupSchema
>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
