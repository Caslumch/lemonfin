import { z } from 'zod';

export const extendTrialSchema = z.object({
  days: z.number().int().min(1).max(365),
});
export type ExtendTrialInput = z.infer<typeof extendTrialSchema>;

export const grantPremiumSchema = z.object({
  days: z.number().int().min(1).max(3650),
});
export type GrantPremiumInput = z.infer<typeof grantPremiumSchema>;

// Configuração de voz (TTS) por conta, editável no /admin. Voz: uma das 3 pt-BR.
// rate/pitch/volume: nominal ("slow"/"high"/"loud") ou "default"; aceitamos
// também relativos ("+20%") por serem válidos no edge-tts, mas a UI usa nominais.
const RELATIVE = /^[+-]?\d{1,3}(\.\d+)?(%|st|Hz)?$/;
const ttsScalar = (nominal: readonly [string, ...string[]]) =>
  z
    .string()
    .refine((v) => (nominal as readonly string[]).includes(v) || RELATIVE.test(v), {
      message: 'valor de voz inválido',
    });

export const setTtsSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  voice: z
    .enum([
      'pt-BR-FranciscaNeural',
      'pt-BR-AntonioNeural',
      'pt-BR-ThalitaMultilingualNeural',
    ])
    .optional(),
  rate: ttsScalar(['default', 'x-slow', 'slow', 'medium', 'fast', 'x-fast']).optional(),
  pitch: ttsScalar(['default', 'x-low', 'low', 'medium', 'high', 'x-high']).optional(),
  volume: ttsScalar([
    'default',
    'silent',
    'x-soft',
    'soft',
    'medium',
    'loud',
    'x-loud',
  ]).optional(),
});
export type SetTtsSettingsInput = z.infer<typeof setTtsSettingsSchema>;
