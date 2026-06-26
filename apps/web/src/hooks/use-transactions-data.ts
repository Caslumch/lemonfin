"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { queryKeys } from "@/lib/query-keys";
import type {
  Transaction,
  TransactionSummary,
  Category,
  PaginatedResponse,
} from "@/types/transaction";
import type { Card } from "@/types/card";

export interface TransactionFilters {
  page: number;
  type: string;
  categoryId: string;
  search: string;
  startDate: string;
  endDate: string;
  memberId?: string;
  // Ordenação. Campos aceitos pela API: date | amount | createdAt.
  orderBy?: "date" | "amount" | "createdAt";
  order?: "asc" | "desc";
}

function buildListParams(f: TransactionFilters) {
  const params = new URLSearchParams();
  params.set("page", String(f.page));
  params.set("perPage", "20");
  if (f.type !== "ALL") params.set("type", f.type);
  if (f.categoryId) params.set("categoryId", f.categoryId);
  if (f.search) params.set("search", f.search);
  params.set("startDate", f.startDate);
  params.set("endDate", f.endDate);
  if (f.memberId) params.set("memberId", f.memberId);
  if (f.orderBy) params.set("orderBy", f.orderBy);
  if (f.order) params.set("order", f.order);
  return params.toString();
}

/** Lista paginada de transações, sensível aos filtros. */
export function useTransactionsList(filters: TransactionFilters) {
  const { fetchApi, token } = useApi();

  return useQuery<PaginatedResponse<Transaction>>({
    queryKey: queryKeys.transactions(filters),
    enabled: Boolean(token),
    // 60s (alinhado ao dashboard): transação via WhatsApp não precisa aparecer
    // na lista em 30s. `refetchOnWindowFocus` cobre o caso de voltar à aba.
    refetchInterval: 60_000,
    queryFn: () =>
      fetchApi<PaginatedResponse<Transaction>>(
        `/transactions?${buildListParams(filters)}`,
      ),
  });
}

/** Resumo (entradas/saídas/saldo) do período selecionado. */
export function useTransactionsSummary(range: { start: string; end: string }) {
  const { fetchApi, token } = useApi();

  return useQuery<TransactionSummary>({
    queryKey: queryKeys.transactionsSummary(range),
    enabled: Boolean(token),
    refetchInterval: 60_000,
    queryFn: () => {
      const qs = new URLSearchParams({
        startDate: range.start,
        endDate: range.end,
      }).toString();
      return fetchApi<TransactionSummary>(`/transactions/summary?${qs}`);
    },
  });
}

/** Categorias do usuário (mudam pouco — cache mais longo). */
export function useCategories() {
  const { fetchApi, token } = useApi();

  return useQuery<Category[]>({
    queryKey: queryKeys.categories,
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    queryFn: () => fetchApi<Category[]>("/categories"),
  });
}

/** Cartões do usuário. */
export function useCards() {
  const { fetchApi, token } = useApi();

  return useQuery<Card[]>({
    queryKey: queryKeys.cards,
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    queryFn: () => fetchApi<Card[]>("/cards"),
  });
}
