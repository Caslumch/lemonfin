import { Module } from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { UsersController } from './controllers/users.controller';
import { CompleteOnboardingUseCase } from './use-cases/complete-onboarding.use-case';
import { RecurringModule } from '../recurring/recurring.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [RecurringModule, BudgetsModule, CategoriesModule],
  controllers: [UsersController],
  providers: [UsersRepository, CompleteOnboardingUseCase],
  exports: [UsersRepository],
})
export class UsersModule {}
