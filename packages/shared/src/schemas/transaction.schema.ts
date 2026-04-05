import { z } from 'zod'

export const transactionTypeSchema = z.enum(['INCOME', 'EXPENSE'])
export const transactionSourceSchema = z.enum(['MANUAL', 'WHATSAPP'])

export const createTransactionSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo'),
  type: transactionTypeSchema,
  categoryId: z.string().cuid(),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
})

export const updateTransactionSchema = createTransactionSchema.partial()

export type TransactionType = z.infer<typeof transactionTypeSchema>
export type TransactionSource = z.infer<typeof transactionSourceSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
