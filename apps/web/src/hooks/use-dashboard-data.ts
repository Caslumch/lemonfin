"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { queryKeys } from "@/lib/query-keys";
import type {
  Transaction,
  TransactionSummary,
  MonthlyBreakdown,
  PaginatedResponse,
  InsightsData,
} from "@/types/transaction";
import type { Goal } from "@/types/goal";
import type { Forecast } from "@/types/forecast";
import type { BudgetStatus } from "@/types/budget";
import type { Card } from "@/types/card";

export interface DashboardData {
  summary: TransactionSummary;
  monthly: MonthlyBreakdown[];
  recent: Transaction[];
  insights: InsightsData | null;
  goals: Goal[];
  forecast: Forecast | null;
  budget: BudgetStatus | null;
  cards: Card[];
}

/**
 * Carrega todos os dados do painel via React Query.
 *
 * - Cache compartilhado: navegar entre telas e voltar mostra os dados na hora
 *   (enquanto revalida em segundo plano), em vez de tela em branco + refetch.
 * - `refetchInterval` substitui o polling manual de 60s. Quando o canal SSE de
 *   "mudou algo na conta" existir, dá pra trocar isso por
 *   `queryClient.invalidateQueries({ queryKey: ["dashboard"] })` no evento e
 *   baixar/desligar o intervalo.
 * - `refetchOnWindowFocus` (default do provider) já cobre o caso do usuário
 *   lançar um gasto no WhatsApp e voltar pra aba do navegador.
 */
export function useDashboardData() {
  const { fetchApi, token } = useApi();

  return useQuery<DashboardData>({
    queryKey: queryKeys.dashboard,
    // Só busca quando já temos o token da sessão.
    enabled: Boolean(token),
    refetchInterval: 60_000,
    queryFn: async () => {
      // "Últimas transações" = lançamentos até hoje. Sem esse teto, as parcelas
      // futuras de compras parceladas (cada parcela é uma transação com data no
      // mês seguinte) ficam no topo do `date desc` e roubam o lugar das reais.
      const recentEndDate = new Date().toISOString();

      // Janela do mês corrente. Sem ela, /transactions/summary soma TODOS os
      // meses — incluindo as parcelas futuras de compras parceladas — e os
      // cards ("Gastos do mês", "Saldo") explodem.
      const now = new Date();
      const monthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0,
      ).toISOString();
      const monthEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ).toISOString();
      const monthQs = new URLSearchParams({
        startDate: monthStart,
        endDate: monthEnd,
      }).toString();

      const [
        summary,
        monthly,
        recentRes,
        insights,
        goals,
        forecast,
        budget,
        cards,
      ] = await Promise.all([
        fetchApi<TransactionSummary>(`/transactions/summary?${monthQs}`),
        fetchApi<MonthlyBreakdown[]>("/transactions/monthly?months=6"),
        fetchApi<PaginatedResponse<Transaction>>(
          `/transactions?perPage=5&page=1&endDate=${encodeURIComponent(recentEndDate)}`,
        ),
        fetchApi<InsightsData>("/transactions/insights").catch(() => null),
        fetchApi<Goal[]>("/goals").catch(() => [] as Goal[]),
        fetchApi<Forecast>("/transactions/forecast").catch(() => null),
        fetchApi<BudgetStatus>("/budgets").catch(() => null),
        fetchApi<Card[]>("/cards").catch(() => [] as Card[]),
      ]);

      return {
        summary,
        monthly,
        recent: recentRes.data,
        insights,
        goals,
        forecast,
        budget,
        cards,
      };
    },
  });
}
