import { z } from 'zod';

export const createConnectTokenSchema = z.object({
  // itemId opcional: quando passado, gera token para ATUALIZAR um Item
  // existente (reconexão). Sem ele, gera token para nova conexão.
  itemId: z.string().uuid().optional(),
});

export type CreateConnectTokenInput = z.infer<typeof createConnectTokenSchema>;

export const linkCardSchema = z.object({
  cardId: z.string().cuid().nullable(),
});

export type LinkCardInput = z.infer<typeof linkCardSchema>;
