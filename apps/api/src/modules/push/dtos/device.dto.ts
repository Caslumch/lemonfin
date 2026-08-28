import { z } from 'zod';

// Registro de um device para push. O `token` é o Expo Push Token
// (ex. "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"); a validação fina do
// formato acontece no envio (Expo.isExpoPushToken), aqui só barra vazio.
export const registerDeviceSchema = z.object({
  token: z.string().min(1).max(256),
  platform: z.enum(['ios', 'android']),
});

export const unregisterDeviceSchema = z.object({
  token: z.string().min(1).max(256),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type UnregisterDeviceInput = z.infer<typeof unregisterDeviceSchema>;
