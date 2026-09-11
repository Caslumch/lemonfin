import { z } from 'zod';

export const createConnectTokenSchema = z.object({
  // itemId opcional: quando passado, gera token para ATUALIZAR um Item
  // existente (reconexão). Sem ele, gera token para nova conexão.
  itemId: z.string().uuid().optional(),
});

export type CreateConnectTokenInput = z.infer<typeof createConnectTokenSchema>;

export const linkItemSchema = z.object({
  // ID do Item na API da Pluggy (UUID visível no dashboard)
  pluggyItemId: z.string().uuid(),
});

export type LinkItemInput = z.infer<typeof linkItemSchema>;
