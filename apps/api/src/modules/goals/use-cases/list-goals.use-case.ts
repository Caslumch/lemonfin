import { Injectable } from '@nestjs/common';
import { GoalsRepository } from '../repositories/goals.repository';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class ListGoalsUseCase {
  constructor(
    private readonly goalsRepository: GoalsRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const goals = await this.goalsRepository.findMany(userIds);

    const now = new Date();
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const { startDate, endDate } = this.getPeriodDates(goal.period, now);

        const breakdown = await this.transactionsRepository.getCategoryBreakdown(
          userIds,
          startDate.toISOString(),
          endDate.toISOString(),
        );

        const categorySpend = breakdown.find((b) => b.categoryId === goal.categoryId);
        const spent = categorySpend?.total ?? 0;
        const limit = goal.amount.toNumber();
        const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

        return {
          ...goal,
          amount: limit,
          progress: {
            spent,
            limit,
            percentage: Math.min(percentage, 999),
            remaining: Math.max(limit - spent, 0),
            exceeded: spent > limit,
            periodStart: startDate.toISOString(),
            periodEnd: endDate.toISOString(),
          },
        };
      }),
    );

    return goalsWithProgress;
  }

  private getPeriodDates(period: string, now: Date) {
    if (period === 'WEEKLY') {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday = start
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - diff);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      return { startDate, endDate };
    }

    // MONTHLY
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }
}
