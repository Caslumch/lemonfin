import { Injectable, Logger } from '@nestjs/common';

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Formato do Expo Push Token: "ExponentPushToken[...]" (ou "ExpoPushToken[...]").
const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;
const CHUNK_SIZE = 100; // limite da API do Expo por request

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

// Cliente do Expo Push Service via HTTP (sem o SDK oficial, que é ESM-only e não
// carrega no build CommonJS do Nest). Falha graciosamente — o envio proativo
// nunca pode derrubar um cron — e devolve os tokens que o Expo reportou como
// inválidos para o chamador podá-los do banco.
@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  static isExpoPushToken(token: string): boolean {
    return EXPO_TOKEN_RE.test(token);
  }

  // Envia a mesma notificação para vários tokens. Retorna a lista de tokens
  // inválidos (formato inválido ou DeviceNotRegistered) para limpeza.
  async send(
    tokens: string[],
    notification: PushNotification,
  ): Promise<{ invalidTokens: string[] }> {
    const invalidTokens: string[] = [];

    // Tokens com formato inválido nunca chegam ao Expo — já marca para remoção.
    const valid = tokens.filter((t) => {
      if (ExpoPushService.isExpoPushToken(t)) return true;
      invalidTokens.push(t);
      return false;
    });
    if (valid.length === 0) return { invalidTokens };

    for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
      const chunkTokens = valid.slice(i, i + CHUNK_SIZE);
      const messages = chunkTokens.map((to) => ({
        to,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data ?? {},
      }));

      let tickets: ExpoTicket[];
      try {
        const headers: Record<string, string> = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        };
        // Opcional: só necessário se "Enhanced Security for Push" estiver ligado
        // na conta Expo. Sem ele, o envio funciona normalmente.
        if (process.env.EXPO_ACCESS_TOKEN) {
          headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
        }
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(messages),
        });
        if (!res.ok) {
          this.logger.error(`Expo push HTTP ${res.status}`);
          continue;
        }
        const json = (await res.json()) as { data?: ExpoTicket[] };
        tickets = json.data ?? [];
      } catch (error) {
        this.logger.error(`Expo push request failed: ${error}`);
        continue;
      }

      // Tickets voltam na MESMA ordem das mensagens. DeviceNotRegistered =
      // app desinstalado / token expirado → remover.
      tickets.forEach((ticket, idx) => {
        if (
          ticket.status === 'error' &&
          ticket.details?.error === 'DeviceNotRegistered'
        ) {
          invalidTokens.push(chunkTokens[idx]);
        }
      });
    }

    return { invalidTokens };
  }
}
