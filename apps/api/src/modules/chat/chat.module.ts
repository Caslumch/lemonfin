import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatCompletionUseCase } from './use-cases/chat-completion.use-case';
import { TransactionsModule } from '../transactions/transactions.module';
import { FamiliesModule } from '../families/families.module';
import { BillingEnforcementModule } from '../../common/billing/billing-enforcement.module';
import { AiUsageModule } from '../ai-usage/ai-usage.module';

@Module({
  imports: [
    TransactionsModule,
    FamiliesModule,
    BillingEnforcementModule,
    AiUsageModule,
  ],
  controllers: [ChatController],
  providers: [ChatCompletionUseCase],
  exports: [ChatCompletionUseCase],
})
export class ChatModule {}
