import { Injectable, Logger } from '@nestjs/common';
import { PushTokenRepository } from '../repositories/push-token.repository';
import { ExpoPushService, type PushNotification } from './expo-push.service';

// Orquestra o envio de push para TODOS os devices de um usuário e limpa os
// tokens que o Expo reportou como inválidos. É o ponto de entrada que os cron
// jobs de lembrete usam (canal 'push'), espelhando o WmodeClientService.
@Injectable()
export class PushDispatchService {
  private readonly logger = new Logger(PushDispatchService.name);

  constructor(
    private readonly tokens: PushTokenRepository,
    private readonly expo: ExpoPushService,
  ) {}

  // Retorna true se o usuário tinha ao menos um device para o qual tentamos
  // entregar. false = sem devices (nada enviado) → o chamador pode liberar o
  // claim de idempotência.
  async sendToUser(
    userId: string,
    notification: PushNotification,
  ): Promise<boolean> {
    const tokens = await this.tokens.findByUser(userId);
    if (tokens.length === 0) return false;

    const { invalidTokens } = await this.expo.send(tokens, notification);
    if (invalidTokens.length > 0) {
      await this.tokens.removeMany(invalidTokens);
      this.logger.log(
        `Pruned ${invalidTokens.length} dead push token(s) for user ${userId}`,
      );
    }

    // Se todos os tokens eram inválidos, não houve entrega real.
    return invalidTokens.length < tokens.length;
  }
}
