import {
  Controller,
  Post,
  Body,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { HandlePluggyWebhookUseCase } from '../use-cases/handle-pluggy-webhook.use-case';

/**
 * Webhook receiver da Pluggy. Endpoint PÚBLICO (sem auth guard) — a Pluggy
 * não assina webhooks com HMAC, então a validação é por IP allowlist
 * (52.67.145.81) no nível de infra/WAF. No código, sempre retornamos 200
 * para evitar retry loops (erros são logados).
 *
 * A Pluggy exige resposta 2XX em até 10s — processamento pesado (sync de
 * transações) é feito no handler mas de forma assíncrona quando possível.
 */
@Controller('pluggy')
export class PluggyWebhookController {
  private readonly logger = new Logger(PluggyWebhookController.name);

  constructor(
    private readonly handler: HandlePluggyWebhookUseCase,
  ) {}

  @Post('webhook')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @HttpCode(200)
  async webhook(
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    try {
      await this.handler.execute({
        event: body.event as string,
        itemId: body.itemId as string | undefined,
        triggeredBy: body.triggeredBy as string | undefined,
        clientUserId: body.clientUserId as string | undefined,
      });
    } catch (err) {
      // Sempre retorna 200 — log do erro para diagnóstico, sem retry loop.
      this.logger.error(
        `Falha ao processar webhook Pluggy (${body.event}): ${String(err)}`,
      );
    }

    return { received: true };
  }
}
