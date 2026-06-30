import { z } from 'zod';

// Prazo (deadline) ancorado ao MEIO-DIA UTC (convenção do projeto, ver memória
// transaction-date-noon-utc). O front envia "YYYY-MM-DD"; `z.coerce.date()` o
// interpretaria como meia-noite UTC, que no fuso do Brasil (UTC-3) volta 1 dia e
// faz o card exibir o mês errado (escolheu dez → mostra nov). Lemos o dia em UTC
// e reancoramos ao meio-dia. Datas com hora (contendo "T...:..") passam normais.
const deadlineSchema = z.coerce.date().transform((d) => {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0),
  );
});

export const createReserveSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  targetAmount: z.number().positive('Valor deve ser positivo'),
  // Aceita string "YYYY-MM-DD" ou Date; precisa ser no futuro (compara a data
  // ancorada ao meio-dia UTC contra agora).
  deadline: deadlineSchema.refine((d) => d.getTime() > Date.now(), {
    message: 'Prazo deve ser no futuro',
  }),
});

export type CreateReserveInput = z.infer<typeof createReserveSchema>;

export const updateReserveSchema = z.object({
  name: z.string().min(1).optional(),
  targetAmount: z.number().positive('Valor deve ser positivo').optional(),
  deadline: deadlineSchema.optional(),
});

export type UpdateReserveInput = z.infer<typeof updateReserveSchema>;
