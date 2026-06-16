import { Module } from '@nestjs/common';
import { BillingController } from './controllers/billing.controller';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import { BillingRepository } from './repositories/billing.repository';
import { StripeClientService } from './services/stripe-client.service';
import { PremiumAccessService } from './services/premium-access.service';
import { CreateCheckoutSessionUseCase } from './use-cases/create-checkout-session.use-case';
import { CreatePortalSessionUseCase } from './use-cases/create-portal-session.use-case';
import { HandleStripeWebhookUseCase } from './use-cases/handle-stripe-webhook.use-case';
import { GetSubscriptionStatusUseCase } from './use-cases/get-subscription-status.use-case';
import { FamiliesModule } from '../families/families.module';

@Module({
  imports: [FamiliesModule],
  controllers: [BillingController, StripeWebhookController],
  providers: [
    BillingRepository,
    StripeClientService,
    PremiumAccessService,
    CreateCheckoutSessionUseCase,
    CreatePortalSessionUseCase,
    HandleStripeWebhookUseCase,
    GetSubscriptionStatusUseCase,
  ],
  // PremiumAccessService é exportado para o PremiumGuard e o WhatsApp (PR 5).
  exports: [BillingRepository, PremiumAccessService],
})
export class BillingModule {}
