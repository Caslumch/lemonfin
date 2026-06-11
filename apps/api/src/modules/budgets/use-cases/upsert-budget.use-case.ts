import { Injectable } from '@nestjs/common';
import { BudgetsRepository } from '../repositories/budgets.repository';
import { UpsertBudgetInput } from '../dtos/budget.dto';

@Injectable()
export class UpsertBudgetUseCase {
  constructor(private readonly budgetsRepository: BudgetsRepository) {}

  async execute(userId: string, input: UpsertBudgetInput) {
    const budget = await this.budgetsRepository.upsert(
      userId,
      input.month,
      input.amount,
    );
    return { ...budget, amount: budget.amount.toNumber() };
  }
}
