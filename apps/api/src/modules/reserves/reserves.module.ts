import { Module } from '@nestjs/common';
import { ReservesController } from './controllers/reserves.controller';
import { ReservesRepository } from './repositories/reserves.repository';
import { CreateReserveUseCase } from './use-cases/create-reserve.use-case';
import { ListReservesUseCase } from './use-cases/list-reserves.use-case';
import { UpdateReserveUseCase } from './use-cases/update-reserve.use-case';
import { DeleteReserveUseCase } from './use-cases/delete-reserve.use-case';
import { ContributeReserveUseCase } from './use-cases/contribute-reserve.use-case';
import { FamiliesModule } from '../families/families.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { CategoriesModule } from '../categories/categories.module';
import { BillingEnforcementModule } from '../../common/billing/billing-enforcement.module';

@Module({
  imports: [
    FamiliesModule,
    TransactionsModule,
    CategoriesModule,
    BillingEnforcementModule,
  ],
  controllers: [ReservesController],
  providers: [
    ReservesRepository,
    CreateReserveUseCase,
    ListReservesUseCase,
    UpdateReserveUseCase,
    DeleteReserveUseCase,
    ContributeReserveUseCase,
  ],
  exports: [ReservesRepository],
})
export class ReservesModule {}
