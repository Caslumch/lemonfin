import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

// Variação mínima em reais para uma categoria virar destaque/alerta. Abaixo
// disso, o percentual (ex.: +887% por R$ 33) é ruído — não representa mudança
// relevante no bolso e afoga os movimentos que pesam de verdade.
const MIN_VARIATION_BRL = 50;

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
    // Janelas de mês em UTC (casam com a gravação noon-UTC das transações). Com
    // construtor local + toISOString() a borda do mês ficava em horário do
    // servidor, divergindo da régua de dateRangeFilter (que ancora em BR).
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const currentStart = new Date(Date.UTC(y, m, 1));
    const currentEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
    const previousStart = new Date(Date.UTC(y, m - 1, 1));
    const previousEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    const daysRemaining = Math.ceil(
      (currentEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    const [
      currentSummary,
      previousSummary,
      currentCategories,
      previousCategories,
    ] = await Promise.all([
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

      // Alerta: gasto >= 80% do mês anterior, com dias restantes. Exige também
      // um DELTA mínimo em reais (ver MIN_DELTA) — sem isso, uma categoria de
      // trocados dispara alerta de "987%" por R$ 33 de variação, afogando os
      // movimentos que de fato pesam no bolso.
      if (previousTotal > 0 && currentTotal > 0 && daysRemaining > 0) {
        const percentOfPrevious = (currentTotal / previousTotal) * 100;
        const delta = Math.abs(currentTotal - previousTotal);
        if (percentOfPrevious >= 80 && delta >= MIN_VARIATION_BRL) {
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

    // Alertas ordenados pelo percentual (maior primeiro).
    alerts.sort((a, b) => b.percentOfPrevious - a.percentOfPrevious);

    // Comparativo ordenado pela variação ABSOLUTA EM REAIS, não pelo percentual.
    // O que importa pro usuário é quanto mudou no bolso: "compras −R$ 2.186"
    // deve vir na frente de "outros +887% (R$ 33)". Ordenar por % joga o barulho
    // de bases minúsculas pro topo e esconde o movimento real.
    categoryComparisons.sort(
      (a, b) =>
        Math.abs(b.currentTotal - b.previousTotal) -
        Math.abs(a.currentTotal - a.previousTotal),
    );

    // "Mais cresceram / diminuíram" exigem variação relevante em reais — sem o
    // piso, "outros +887%" (R$ 33) roubaria o lugar de "compras −R$ 2.186".
    const isRelevant = (c: CategoryComparison) =>
      Math.abs(c.currentTotal - c.previousTotal) >= MIN_VARIATION_BRL;

    const topGrowing = categoryComparisons
      .filter((c) => c.trend === 'up' && isRelevant(c))
      .slice(0, 3);

    const topShrinking = categoryComparisons
      .filter((c) => c.trend === 'down' && isRelevant(c))
      .slice(0, 3);

    // Despesa do mês para os insights = gasto TOTAL (fora-cartão + cartão). O
    // getSummary separa `expense` (só fora-cartão) de `cardExpense`; aqui
    // somamos os dois para a definição de "quanto gastei" bater com os
    // comparativos de categoria (getCategoryBreakdown inclui cartão). Sem isto, o
    // topo do painel mostrava só o fora-cartão enquanto as categorias listavam o
    // gasto com cartão — números incoerentes na mesma tela.
    const currentExpense = currentSummary.expense + currentSummary.cardExpense;
    const previousExpense =
      previousSummary.expense + previousSummary.cardExpense;

    const overallVariation =
      previousExpense > 0
        ? ((currentExpense - previousExpense) / previousExpense) * 100
        : 0;

    return {
      currentMonth: {
        income: currentSummary.income,
        expense: currentExpense,
        balance: currentSummary.balance,
      },
      previousMonth: {
        income: previousSummary.income,
        expense: previousExpense,
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
