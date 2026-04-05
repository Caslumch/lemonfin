import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { Request } from 'express';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    this.secret = this.config.get<string>('WMODE_WEBHOOK_SECRET') ?? '';
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.secret) {
      return true;
    }

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

    if (signature !== expected) {
      this.logger.warn('Invalid webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
