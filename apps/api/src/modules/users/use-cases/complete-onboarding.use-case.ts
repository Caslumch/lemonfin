import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { RecurringRepository } from '../../recurring/repositories/recurring.repository';
import { BudgetsRepository } from '../../budgets/repositories/budgets.repository';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { OnboardingInput } from '../dtos/onboarding.dto';

@Injectable()
export class CompleteOnboardingUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly recurringRepository: RecurringRepository,
    private readonly budgetsRepository: BudgetsRepository,
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  async execute(userId: string, input: OnboardingInput) {
    let recurringCreated = 0;

    // Renda mensal → recorrência de receita (categoria salário).
    if (input.income) {
      const salary = await this.categoriesRepository.findBySlug('salario');
      if (salary) {
        await this.recurringRepository.create({
          description: 'Salário',
          amount: input.income.amount,
          type: 'INCOME',
          dayOfMonth: input.income.dayOfMonth,
          userId,
          categoryId: salary.id,
        });
        recurringCreated++;
      }
    }

    // Contas fixas → recorrências de despesa.
    for (const exp of input.fixedExpenses) {
      let category = await this.categoriesRepository.findBySlug(
        exp.categorySlug,
      );
      if (!category) {
        category = await this.categoriesRepository.findBySlug('outros');
      }
      if (!category) continue;

      await this.recurringRepository.create({
        description: exp.description,
        amount: exp.amount,
        type: 'EXPENSE',
        dayOfMonth: exp.dayOfMonth,
        userId,
        categoryId: category.id,
      });
      recurringCreated++;
    }

    // Orçamento do mês atual.
    if (input.budgetAmount) {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await this.budgetsRepository.upsert(userId, month, input.budgetAmount);
    }

    const user = await this.usersRepository.markOnboarded(userId);

    return {
      onboardedAt: user.onboardedAt,
      recurringCreated,
      budgetSet: input.budgetAmount != null,
    };
  }
}
