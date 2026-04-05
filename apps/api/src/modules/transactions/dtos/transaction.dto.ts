import { z } from 'zod';

export const createTransactionSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo'),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
  categoryId: z.string().cuid(),
  cardId: z.string().cuid().optional(),
});

export const updateTransactionSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo').optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
  categoryId: z.string().cuid().optional(),
  cardId: z.string().cuid().nullable().optional(),
});

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  categoryId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  orderBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
