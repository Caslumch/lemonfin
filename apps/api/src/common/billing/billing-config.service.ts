import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Flag-mestre do enforcement de billing (paywall hard).
 *
 * Desligado por padrão: o paywall só bloqueia quando BILLING_ENFORCEMENT=on.
 * Isso permite mergear o código sem prender ninguém — liga-se em produção só
 * quando o Stripe estiver configurado e testado.
 */
@Injectable()
export class BillingConfigService {
  private readonly enforcement: boolean;

  constructor(config: ConfigService) {
    this.enforcement =
      config.get<string>('BILLING_ENFORCEMENT', 'off').toLowerCase() === 'on';
  }

  get enforcementEnabled(): boolean {
    return this.enforcement;
  }
}
