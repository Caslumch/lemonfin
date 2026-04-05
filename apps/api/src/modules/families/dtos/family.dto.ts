import { z } from 'zod';

export const createFamilySchema = z.object({
  name: z.string().min(2).max(50),
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;

export const joinFamilySchema = z.object({
  code: z.string().length(8),
});

export type JoinFamilyInput = z.infer<typeof joinFamilySchema>;
