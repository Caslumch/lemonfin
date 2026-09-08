import { Module } from '@nestjs/common';
import { PluggyController } from './controllers/pluggy.controller';
import { PluggyWebhookController } from './controllers/pluggy-webhook.controller';
import { PluggyClientService } from './services/pluggy-client.service';
import { PluggySyncService } from './services/pluggy-sync.service';
import { PluggyRepository } from './repositories/pluggy.repository';
import { CreateConnectTokenUseCase } from './use-cases/create-connect-token.use-case';
import { HandlePluggyWebhookUseCase } from './use-cases/handle-pluggy-webhook.use-case';
import { FamiliesModule } from '../families/families.module';
import { CategoriesModule } from '../categories/categories.module';
import { BillingEnforcementModule } from '../../common/billing/billing-enforcement.module';

@Module({
  imports: [FamiliesModule, CategoriesModule, BillingEnforcementModule],
  controllers: [PluggyController, PluggyWebhookController],
  providers: [
    PluggyClientService,
    PluggySyncService,
    PluggyRepository,
    CreateConnectTokenUseCase,
    HandlePluggyWebhookUseCase,
  ],
  exports: [PluggyClientService, PluggyRepository],
})
export class PluggyModule {}
