import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Dê um nome para a chave')
    .max(60, 'Nome muito longo'),
  // Escopos opcionais. Default read+write (no service). "read" = só consultas;
  // "write" = também criar/editar. Uma key só-leitura é útil para dashboards e
  // agentes de análise que não devem lançar transações.
  scopes: z.array(z.enum(['read', 'write'])).nonempty().optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
