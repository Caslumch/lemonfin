import { Module, forwardRef } from '@nestjs/common';
import { RecurringController } from './controllers/recurring.controller';
import { RecurringRepository } from './repositories/recurring.repository';
import { RecurringMaterializerService } from './services/recurring-materializer.service';
import { CreateRecurringUseCase } from './use-cases/create-recurring.use-case';
import { ListRecurringUseCase } from './use-cases/list-recurring.use-case';
import { UpdateRecurringUseCase } from './use-cases/update-recurring.use-case';
import { DeleteRecurringUseCase } from './use-cases/delete-recurring.use-case';
import { CategoriesModule } from '../categories/categories.module';
import { CardsModule } from '../cards/cards.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { FamiliesModule } from '../families/families.module';
import { BillingEnforcementModule } from '../../common/billing/billing-enforcement.module';

@Module({
  imports: [
    CategoriesModule,
    CardsModule,
    forwardRef(() => TransactionsModule),
    BillingEnforcementModule,
    FamiliesModule,
  ],
  controllers: [RecurringController],
  providers: [
    RecurringRepository,
    RecurringMaterializerService,
    CreateRecurringUseCase,
    ListRecurringUseCase,
    UpdateRecurringUseCase,
    DeleteRecurringUseCase,
  ],
  exports: [RecurringRepository],
})
export class RecurringModule {}
