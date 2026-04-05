import { Module } from '@nestjs/common';
import { CardsController } from './controllers/cards.controller';
import { CardsRepository } from './repositories/cards.repository';
import { CreateCardUseCase } from './use-cases/create-card.use-case';
import { ListCardsUseCase } from './use-cases/list-cards.use-case';
import { UpdateCardUseCase } from './use-cases/update-card.use-case';
import { DeleteCardUseCase } from './use-cases/delete-card.use-case';
import { GetCardInvoiceUseCase } from './use-cases/get-card-invoice.use-case';

@Module({
  controllers: [CardsController],
  providers: [
    CardsRepository,
    CreateCardUseCase,
    ListCardsUseCase,
    UpdateCardUseCase,
    DeleteCardUseCase,
    GetCardInvoiceUseCase,
  ],
  exports: [CardsRepository],
})
export class CardsModule {}
