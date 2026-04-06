import { Body, Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import { WebhookSignatureGuard } from '../guards/webhook-signature.guard';
import { WhatsappService } from '../services/whatsapp.service';

interface WebhookPayload {
  event: string;
  payload: {
    sessionId: string;
    messageId: string;
    from: string;
    content: string;
    timestamp: number;
  };
  timestamp: string;
}

@Controller('whatsapp')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly processedMessages = new Set<string>();

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('webhook')
  @HttpCode(200)
  @UseGuards(WebhookSignatureGuard)
  async handleWebhook(@Body() body: WebhookPayload) {
    this.logger.log(`Webhook received: ${body.event}`);
    this.logger.debug(`Webhook payload: ${JSON.stringify(body.payload)}`);

    if (body.event !== 'message.received') {
      return { received: true, processed: false };
    }

    const { from, content, sessionId, messageId } = body.payload;

    if (!from || !content) {
      return { received: true, processed: false };
    }

    // Deduplicate: ignore if already processed
    if (messageId && this.processedMessages.has(messageId)) {
      this.logger.warn(`Duplicate message ignored: ${messageId}`);
      return { received: true, processed: false };
    }

    if (messageId) {
      this.processedMessages.add(messageId);
      // Clean up old entries after 5 minutes
      setTimeout(() => this.processedMessages.delete(messageId), 5 * 60 * 1000);
    }

    // Process async to respond to webhook quickly
    this.whatsappService
      .handleIncomingMessage({ from, content, sessionId })
      .catch((error) => {
        this.logger.error(`Error processing message: ${error}`);
      });

    return { received: true, processed: true };
  }
}
