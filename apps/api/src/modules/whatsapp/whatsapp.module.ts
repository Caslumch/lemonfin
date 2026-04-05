import { Module } from '@nestjs/common';
import { WebhookController } from './controllers/webhook.controller';
import { WmodeClientService } from './services/wmode-client.service';
import { MessageParserService } from './services/message-parser.service';
import { WhatsappService } from './services/whatsapp.service';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { UsersModule } from '../users/users.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { CardsModule } from '../cards/cards.module';

@Module({
  imports: [UsersModule, CategoriesModule, TransactionsModule, CardsModule],
  controllers: [WebhookController],
  providers: [
    WmodeClientService,
    MessageParserService,
    WhatsappService,
    WebhookSignatureGuard,
  ],
  exports: [WmodeClientService],
})
export class WhatsappModule {}
