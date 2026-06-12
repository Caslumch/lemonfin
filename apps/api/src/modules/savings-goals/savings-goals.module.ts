import { Module } from '@nestjs/common';
import { SavingsGoalsController } from './controllers/savings-goals.controller';
import { SavingsGoalsRepository } from './repositories/savings-goals.repository';
import { CreateSavingsGoalUseCase } from './use-cases/create-savings-goal.use-case';
import { ListSavingsGoalsUseCase } from './use-cases/list-savings-goals.use-case';
import { FamiliesModule } from '../families/families.module';

@Module({
  imports: [FamiliesModule],
  controllers: [SavingsGoalsController],
  providers: [
    SavingsGoalsRepository,
    CreateSavingsGoalUseCase,
    ListSavingsGoalsUseCase,
  ],
  exports: [SavingsGoalsRepository],
})
export class SavingsGoalsModule {}
