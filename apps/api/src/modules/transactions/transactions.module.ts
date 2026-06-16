import { Module, forwardRef } from '@nestjs/common';
import { TransactionsController } from './controllers/transactions.controller';
import { TransactionsRepository } from './repositories/transactions.repository';
import { CreateTransactionUseCase } from './use-cases/create-transaction.use-case';
import { ListTransactionsUseCase } from './use-cases/list-transactions.use-case';
import { UpdateTransactionUseCase } from './use-cases/update-transaction.use-case';
import { DeleteTransactionUseCase } from './use-cases/delete-transaction.use-case';
import { GetSummaryUseCase } from './use-cases/get-summary.use-case';
import { GetMonthlyBreakdownUseCase } from './use-cases/get-monthly-breakdown.use-case';
import { GetCategoryBreakdownUseCase } from './use-cases/get-category-breakdown.use-case';
import { GetInsightsUseCase } from './use-cases/get-insights.use-case';
import { GetForecastUseCase } from './use-cases/get-forecast.use-case';
import { CategoriesModule } from '../categories/categories.module';
import { FamiliesModule } from '../families/families.module';
import { RecurringModule } from '../recurring/recurring.module';
import { CardsModule } from '../cards/cards.module';
import { BillingEnforcementModule } from '../../common/billing/billing-enforcement.module';

@Module({
  imports: [
    CategoriesModule,
    FamiliesModule,
    CardsModule,
    forwardRef(() => RecurringModule),
    BillingEnforcementModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsRepository,
    CreateTransactionUseCase,
    ListTransactionsUseCase,
    UpdateTransactionUseCase,
    DeleteTransactionUseCase,
    GetSummaryUseCase,
    GetMonthlyBreakdownUseCase,
    GetCategoryBreakdownUseCase,
    GetInsightsUseCase,
    GetForecastUseCase,
  ],
  exports: [TransactionsRepository, GetForecastUseCase],
})
export class TransactionsModule {}
