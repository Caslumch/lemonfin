import { z } from 'zod';

// Exclusão de conta exige a senha atual (re-autenticação) para evitar exclusão
// acidental / por terceiro com o app aberto.
export const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
