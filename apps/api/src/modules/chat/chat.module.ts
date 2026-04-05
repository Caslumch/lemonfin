import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatCompletionUseCase } from './use-cases/chat-completion.use-case';
import { TransactionsModule } from '../transactions/transactions.module';
import { FamiliesModule } from '../families/families.module';

@Module({
  imports: [TransactionsModule, FamiliesModule],
  controllers: [ChatController],
  providers: [ChatCompletionUseCase],
})
export class ChatModule {}
