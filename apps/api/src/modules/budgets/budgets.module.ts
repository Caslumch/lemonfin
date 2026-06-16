import { Module } from '@nestjs/common';
import { BudgetsController } from './controllers/budgets.controller';
import { BudgetsRepository } from './repositories/budgets.repository';
import { UpsertBudgetUseCase } from './use-cases/upsert-budget.use-case';
import { GetBudgetUseCase } from './use-cases/get-budget.use-case';
import { TransactionsModule } from '../transactions/transactions.module';
import { FamiliesModule } from '../families/families.module';
import { BillingEnforcementModule } from '../../common/billing/billing-enforcement.module';

@Module({
  imports: [TransactionsModule, FamiliesModule, BillingEnforcementModule],
  controllers: [BudgetsController],
  providers: [BudgetsRepository, UpsertBudgetUseCase, GetBudgetUseCase],
  exports: [BudgetsRepository, GetBudgetUseCase],
})
export class BudgetsModule {}
