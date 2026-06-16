import { z } from 'zod';

export const extendTrialSchema = z.object({
  days: z.number().int().min(1).max(365),
});
export type ExtendTrialInput = z.infer<typeof extendTrialSchema>;

export const grantPremiumSchema = z.object({
  days: z.number().int().min(1).max(3650),
});
export type GrantPremiumInput = z.infer<typeof grantPremiumSchema>;
