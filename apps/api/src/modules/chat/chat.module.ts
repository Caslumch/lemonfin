import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatCompletionUseCase } from './use-cases/chat-completion.use-case';
import { AdvisorMemoryRepository } from './repositories/advisor-memory.repository';
import { TransactionsModule } from '../transactions/transactions.module';
import { FamiliesModule } from '../families/families.module';
import { GoalsModule } from '../goals/goals.module';
import { ReservesModule } from '../reserves/reserves.module';
import { RecurringModule } from '../recurring/recurring.module';
import { CardsModule } from '../cards/cards.module';
import { BillingEnforcementModule } from '../../common/billing/billing-enforcement.module';
import { AiUsageModule } from '../ai-usage/ai-usage.module';

@Module({
  imports: [
    TransactionsModule,
    FamiliesModule,
    // Tools do assessor: metas, reservas, contas fixas e cartões/fatura.
    GoalsModule,
    ReservesModule,
    RecurringModule,
    CardsModule,
    BillingEnforcementModule,
    AiUsageModule,
  ],
  controllers: [ChatController],
  providers: [ChatCompletionUseCase, AdvisorMemoryRepository],
  // AdvisorMemoryRepository é exportado para o WhatsApp: os comandos diretos de
  // memória ("o que você sabe sobre mim", "esquece tudo") leem/apagam a MESMA
  // memória que o assessor usa — não existe uma segunda memória por canal.
  exports: [ChatCompletionUseCase, AdvisorMemoryRepository],
})
export class ChatModule {}
