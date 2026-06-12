import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    // getOrThrow: o webhook identifica o usuário pelo telefone do payload, então
    // SEM segredo configurado qualquer um forjaria mensagens em nome de qualquer
    // conta. Falhar no boot é preferível a subir com o webhook aberto.
    this.secret = this.config.getOrThrow<string>('WMODE_WEBHOOK_SECRET');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.headers['x-webhook-signature'] as string;

    if (!signature) {
      this.logger.warn('Missing X-Webhook-Signature header');
      throw new UnauthorizedException('Missing webhook signature');
    }

    const expectedHash = createHmac('sha256', this.secret)
      .update(JSON.stringify(request.body))
      .digest('hex');

    const expected = `sha256=${expectedHash}`;

    if (!this.safeEqual(signature, expected)) {
      this.logger.warn('Invalid webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }

  // Comparação em tempo constante para não vazar a assinatura esperada via
  // timing. timingSafeEqual exige buffers de mesmo tamanho; comprimentos
  // diferentes já significam assinatura inválida.
  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }
}
