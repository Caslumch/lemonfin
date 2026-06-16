import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { StripeClientService } from '../services/stripe-client.service';
import { HandleStripeWebhookUseCase } from '../use-cases/handle-stripe-webhook.use-case';

@Controller('billing')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripe: StripeClientService,
    private readonly handler: HandleStripeWebhookUseCase,
  ) {}

  // Rota pública (Stripe não manda JWT). A autenticidade vem da verificação de
  // assinatura. Throttle generoso para picos de eventos.
  @Post('webhook')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody || !signature) {
      throw new BadRequestException('Webhook sem corpo cru ou assinatura.');
    }

    let event;
    try {
      event = this.stripe.constructWebhookEvent(rawBody, signature);
    } catch (err) {
      // Assinatura inválida → 400 (não é retry-able, é ataque ou má config).
      this.logger.warn(`Assinatura de webhook inválida: ${String(err)}`);
      throw new BadRequestException('Assinatura inválida.');
    }

    try {
      await this.handler.execute(event);
    } catch (err) {
      // Erro de processamento: logamos mas devolvemos 200 para o Stripe não
      // reenviar em loop por um bug nosso. Os eventos chave são idempotentes e
      // re-sincronizáveis pelo portal/próximos eventos.
      this.logger.error(
        `Falha ao processar evento ${event.id} (${event.type}): ${String(err)}`,
      );
    }

    return { received: true };
  }
}
