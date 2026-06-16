import { z } from 'zod';

export const createCheckoutSchema = z.object({
  cycle: z.enum(['monthly', 'yearly']),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
