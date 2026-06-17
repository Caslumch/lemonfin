import { Module } from '@nestjs/common';
import { WebhookController } from './controllers/webhook.controller';
import { WmodeClientService } from './services/wmode-client.service';
import { MessageParserService } from './services/message-parser.service';
import { TranscriptionService } from './services/transcription.service';
import { WhatsappService } from './services/whatsapp.service';
import { ConversationRepository } from './repositories/conversation.repository';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { UsersModule } from '../users/users.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { CardsModule } from '../cards/cards.module';
import { FamiliesModule } from '../families/families.module';
import { RecurringModule } from '../recurring/recurring.module';
import { ReservesModule } from '../reserves/reserves.module';
import { GoalsModule } from '../goals/goals.module';
import { ChatModule } from '../chat/chat.module';
import { BillingModule } from '../billing/billing.module';
import { BillingEnforcementModule } from '../../common/billing/billing-enforcement.module';
import { AiUsageModule } from '../ai-usage/ai-usage.module';

@Module({
  imports: [
    UsersModule,
    CategoriesModule,
    TransactionsModule,
    CardsModule,
    FamiliesModule,
    RecurringModule,
    ReservesModule,
    GoalsModule,
    ChatModule,
    BillingModule,
    BillingEnforcementModule,
    AiUsageModule,
  ],
  controllers: [WebhookController],
  providers: [
    WmodeClientService,
    MessageParserService,
    TranscriptionService,
    WhatsappService,
    ConversationRepository,
    WebhookSignatureGuard,
  ],
  exports: [WmodeClientService],
})
export class WhatsappModule {}
