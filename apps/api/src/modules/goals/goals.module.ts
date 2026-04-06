import { Module } from '@nestjs/common';
import { GoalsController } from './controllers/goals.controller';
import { GoalsRepository } from './repositories/goals.repository';
import { CreateGoalUseCase } from './use-cases/create-goal.use-case';
import { ListGoalsUseCase } from './use-cases/list-goals.use-case';
import { UpdateGoalUseCase } from './use-cases/update-goal.use-case';
import { DeleteGoalUseCase } from './use-cases/delete-goal.use-case';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { FamiliesModule } from '../families/families.module';

@Module({
  imports: [CategoriesModule, TransactionsModule, FamiliesModule],
  controllers: [GoalsController],
  providers: [
    GoalsRepository,
    CreateGoalUseCase,
    ListGoalsUseCase,
    UpdateGoalUseCase,
    DeleteGoalUseCase,
  ],
  exports: [GoalsRepository],
})
export class GoalsModule {}
