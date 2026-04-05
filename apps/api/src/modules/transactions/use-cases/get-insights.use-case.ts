import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

export interface CategoryComparison {
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    colorBg: string;
    colorText: string;
  } | null;
  currentTotal: number;
  previousTotal: number;
  variation: number; // percentage change
  trend: 'up' | 'down' | 'stable';
}

export interface SpendingAlert {
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    colorBg: string;
    colorText: string;
  } | null;
  currentTotal: number;
  previousTotal: number;
  percentOfPrevious: number;
  daysRemaining: number;
}

export interface InsightsResponse {
  currentMonth: { income: number; expense: number; balance: number };
  previousMonth: { income: number; expense: number; balance: number };
  overallVariation: number;
  alerts: SpendingAlert[];
  categoryComparisons: CategoryComparison[];
  topGrowing: CategoryComparison[];
  topShrinking: CategoryComparison[];
}

@Injectable()
export class GetInsightsUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(userId: string): Promise<InsightsResponse> {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const daysRemaining = Math.ceil(
      (currentEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    const [currentSummary, previousSummary, currentCategories, previousCategories] =
      await Promise.all([
        this.transactionsRepository.getSummary(
          userIds,
          currentStart.toISOString(),
          currentEnd.toISOString(),
        ),
        this.transactionsRepository.getSummary(
          userIds,
          previousStart.toISOString(),
          previousEnd.toISOString(),
        ),
        this.transactionsRepository.getCategoryBreakdown(
          userIds,
          currentStart.toISOString(),
          currentEnd.toISOString(),
        ),
        this.transactionsRepository.getCategoryBreakdown(
          userIds,
          previousStart.toISOString(),
          previousEnd.toISOString(),
        ),
      ]);

    const previousMap = new Map(
      previousCategories.map((c) => [c.categoryId, c]),
    );

    const categoryComparisons: CategoryComparison[] = [];
    const alerts: SpendingAlert[] = [];

    // Build comparisons for all categories that appear in either month
    const allCategoryIds = new Set([
      ...currentCategories.map((c) => c.categoryId),
      ...previousCategories.map((c) => c.categoryId),
    ]);

    for (const catId of allCategoryIds) {
      const current = currentCategories.find((c) => c.categoryId === catId);
      const previous = previousMap.get(catId);
      const currentTotal = current?.total ?? 0;
      const previousTotal = previous?.total ?? 0;
      const category = current?.category ?? previous?.category ?? null;

      let variation = 0;
      if (previousTotal > 0) {
        variation = ((currentTotal - previousTotal) / previousTotal) * 100;
      } else if (currentTotal > 0) {
        variation = 100;
      }

      const trend: 'up' | 'down' | 'stable' =
        variation > 5 ? 'up' : variation < -5 ? 'down' : 'stable';

      categoryComparisons.push({
        categoryId: catId,
        category,
        currentTotal,
        previousTotal,
        variation,
        trend,
      });

      // Alert if spending is >= 80% of previous month with days remaining
      if (previousTotal > 0 && currentTotal > 0 && daysRemaining > 0) {
        const percentOfPrevious = (currentTotal / previousTotal) * 100;
        if (percentOfPrevious >= 80) {
          alerts.push({
            categoryId: catId,
            category,
            currentTotal,
            previousTotal,
            percentOfPrevious,
            daysRemaining,
          });
        }
      }
    }

    // Sort alerts by percentage (highest first)
    alerts.sort((a, b) => b.percentOfPrevious - a.percentOfPrevious);

    // Sort comparisons by absolute variation
    categoryComparisons.sort(
      (a, b) => Math.abs(b.variation) - Math.abs(a.variation),
    );

    const topGrowing = categoryComparisons
      .filter((c) => c.trend === 'up')
      .slice(0, 3);

    const topShrinking = categoryComparisons
      .filter((c) => c.trend === 'down')
      .slice(0, 3);

    const overallVariation =
      previousSummary.expense > 0
        ? ((currentSummary.expense - previousSummary.expense) /
            previousSummary.expense) *
          100
        : 0;

    return {
      currentMonth: {
        income: currentSummary.income,
        expense: currentSummary.expense,
        balance: currentSummary.balance,
      },
      previousMonth: {
        income: previousSummary.income,
        expense: previousSummary.expense,
        balance: previousSummary.balance,
      },
      overallVariation,
      alerts,
      categoryComparisons,
      topGrowing,
      topShrinking,
    };
  }
}
