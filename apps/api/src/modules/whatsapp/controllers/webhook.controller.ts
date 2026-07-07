import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as Sentry from '@sentry/nestjs';
import { WebhookSignatureGuard } from '../guards/webhook-signature.guard';
import { WhatsappService } from '../services/whatsapp.service';
import { ProcessedMessageRepository } from '../repositories/processed-message.repository';

// Mídia embutida no webhook da WMode (base64). Para áudio, `data` traz o buffer
// em base64; ausente quando a mídia excedeu o limite inline (`truncated: true`).
interface WebhookMedia {
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  mimetype?: string;
  seconds?: number;
  ptt?: boolean;
  fileName?: string;
  bytes?: number;
  data?: string;
  truncated?: boolean;
}

interface WebhookPayload {
  event: string;
  payload: {
    sessionId: string;
    messageId: string;
    from: string;
    // Para áudio/mídia, `content` vem como placeholder ("[áudio]"); o conteúdo
    // real está em `media`.
    content: string;
    type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
    media?: WebhookMedia;
    timestamp: number;
  };
  timestamp: string;
}

@Controller('whatsapp')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly processedMessages: ProcessedMessageRepository,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @UseGuards(WebhookSignatureGuard)
  async handleWebhook(@Body() body: WebhookPayload) {
    this.logger.log(`Webhook received: ${body.event}`);
    this.logger.debug(`Webhook payload: ${JSON.stringify(body.payload)}`);

    if (body.event !== 'message.received') {
      return { received: true, processed: false };
    }

    const { from, content, sessionId, messageId, type, media } = body.payload;

    // Quando é áudio com mídia embutida, monta o payload de áudio (base64 +
    // mimetype) para transcrição. `data` definido aqui implica áudio válido.
    const audio =
      type === 'AUDIO' && media?.data
        ? { data: media.data, mimetype: media.mimetype }
        : undefined;

    // Imagem (comprovante/nota): mesma forma do áudio. `data` definido aqui
    // implica imagem válida embutida. `truncated: true` (mídia grande cortada
    // do base64) cai como ausente — o fluxo responde com fallback.
    const image =
      type === 'IMAGE' && media?.data
        ? { data: media.data, mimetype: media.mimetype }
        : undefined;

    // Texto exige `content`; áudio/imagem exigem a mídia (o `content` vem só
    // como placeholder, ex "[áudio]"/"[imagem]"). Sem nenhum, nada a processar.
    if (!from || (!content && !audio && !image)) {
      return { received: true, processed: false };
    }

    // Idempotência durável: reivindica o messageId no banco (unicidade). Se já
    // foi processado (retry do WMode, redeploy, outra instância), ignora — evita
    // registrar a mesma transação 2x. Substitui o Set em memória, que não
    // sobrevivia a restart nem era compartilhado entre réplicas.
    if (messageId) {
      const isFirst = await this.processedMessages.claim(messageId);
      if (!isFirst) {
        this.logger.warn(`Duplicate message ignored: ${messageId}`);
        return { received: true, processed: false };
      }
    }

    // Process async to respond to webhook quickly. O claim acontece ANTES do
    // processamento (prioriza não-duplicar sobre não-perder): se
    // handleIncomingMessage falhar depois do claim, o messageId segue marcado e
    // o retry do WMode é rejeitado como duplicado. NÃO revertemos o claim aqui
    // porque o processamento tem efeitos colaterais no meio do fluxo (cria
    // transação, envia resposta, grava pendência) — um retry cego reprocessaria
    // e poderia registrar 2x. Em vez disso, capturamos a falha pós-claim como
    // dead-letter no Sentry (com messageId/from) para reprocessamento manual e
    // alerta — a mensagem não some sem rastro.
    this.whatsappService
      .handleIncomingMessage({ from, content, sessionId, audio, image })
      .catch((error: unknown) => {
        this.logger.error(
          `Error processing message ${messageId} from ${from}: ${String(error)}`,
        );
        Sentry.captureException(error, {
          tags: { area: 'whatsapp-webhook', kind: 'post_claim_failure' },
          extra: {
            messageId,
            from,
            sessionId,
            type: type ?? 'TEXT',
            // Marca que o claim foi consumido e o retry do WMode será
            // rejeitado — este evento precisa de reprocessamento manual.
            claimConsumed: Boolean(messageId),
          },
        });
      });

    return { received: true, processed: true };
  }
}
