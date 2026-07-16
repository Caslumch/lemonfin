import { z } from 'zod';

export const updateReminderSettingsSchema = z.object({
  billsEnabled: z.boolean().optional(),
  // Antecedência do lembrete de vencimento (1 a 7 dias).
  daysBefore: z.number().int().min(1).max(7).optional(),
  alertsEnabled: z.boolean().optional(),
  dailySummaryEnabled: z.boolean().optional(),
});

export type UpdateReminderSettingsInput = z.infer<
  typeof updateReminderSettingsSchema
>;
