import { z } from 'zod';

export const enableTwoFactorSchema = z.object({
  secret: z.string().min(1),
  code: z.string().length(6),
});

export const disableTwoFactorSchema = z.object({
  password: z.string().min(1),
});

export type EnableTwoFactorInput = z.infer<typeof enableTwoFactorSchema>;
export type DisableTwoFactorInput = z.infer<typeof disableTwoFactorSchema>;
