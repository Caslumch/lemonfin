import { Module } from '@nestjs/common';
import { BillingModule } from '../../modules/billing/billing.module';
import { BillingConfigService } from './billing-config.service';
import { PremiumGuard } from './premium.guard';

/**
 * Disponibiliza o PremiumGuard (paywall hard) para os módulos de domínio.
 *
 * Uso: o módulo importa este e o controller faz
 *   @UseGuards(JwtAuthGuard, PremiumGuard)
 * — nessa ordem, para o JwtAuthGuard popular req.user ANTES do PremiumGuard.
 * (Não registramos como APP_GUARD global porque o JwtAuthGuard é por-controller;
 * um guard global rodaria antes dele e não teria req.user.)
 */
@Module({
  imports: [BillingModule],
  providers: [BillingConfigService, PremiumGuard],
  // Re-exporta BillingModule para que PremiumAccessService (dependência do
  // PremiumGuard) resolva no injector do módulo consumidor, onde o guard é
  // instanciado pelo @UseGuards.
  exports: [PremiumGuard, BillingConfigService, BillingModule],
})
export class BillingEnforcementModule {}
