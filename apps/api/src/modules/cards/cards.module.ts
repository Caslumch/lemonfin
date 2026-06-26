import { Module, forwardRef } from '@nestjs/common';
import { CardsController } from './controllers/cards.controller';
import { CardsRepository } from './repositories/cards.repository';
import { InvoicePaymentRepository } from './repositories/invoice-payment.repository';
import { CreateCardUseCase } from './use-cases/create-card.use-case';
import { ListCardsUseCase } from './use-cases/list-cards.use-case';
import { UpdateCardUseCase } from './use-cases/update-card.use-case';
import { DeleteCardUseCase } from './use-cases/delete-card.use-case';
import { GetCardInvoiceUseCase } from './use-cases/get-card-invoice.use-case';
import { PayInvoiceUseCase } from './use-cases/pay-invoice.use-case';
import { UndoInvoicePaymentUseCase } from './use-cases/undo-invoice-payment.use-case';
import { FamiliesModule } from '../families/families.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { BillingEnforcementModule } from '../../common/billing/billing-enforcement.module';

@Module({
  imports: [
    FamiliesModule,
    CategoriesModule,
    // TransactionsModule importa CardsModule → forwardRef quebra o ciclo de DI.
    forwardRef(() => TransactionsModule),
    BillingEnforcementModule,
  ],
  controllers: [CardsController],
  providers: [
    CardsRepository,
    InvoicePaymentRepository,
    CreateCardUseCase,
    ListCardsUseCase,
    UpdateCardUseCase,
    DeleteCardUseCase,
    GetCardInvoiceUseCase,
    PayInvoiceUseCase,
    UndoInvoicePaymentUseCase,
  ],
  exports: [CardsRepository, InvoicePaymentRepository, PayInvoiceUseCase],
})
export class CardsModule {}
