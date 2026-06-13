import { Module } from '@nestjs/common';
import { WebhookController } from './controllers/webhook.controller';
import { WmodeClientService } from './services/wmode-client.service';
import { MessageParserService } from './services/message-parser.service';
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
  ],
  controllers: [WebhookController],
  providers: [
    WmodeClientService,
    MessageParserService,
    WhatsappService,
    ConversationRepository,
    WebhookSignatureGuard,
  ],
  exports: [WmodeClientService],
})
export class WhatsappModule {}
