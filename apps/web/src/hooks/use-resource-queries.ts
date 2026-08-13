"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { queryKeys } from "@/lib/query-keys";
import type { CardInvoice } from "@/types/card";
import type { InsightsData } from "@/types/transaction";
import type { ManagedCategory } from "@/types/category";
import type { Goal } from "@/types/goal";
import type { RecurringListResponse } from "@/types/recurring";
import type { Reserve } from "@/types/reserve";

/**
 * Hooks de query por recurso. Padrão comum: só busca com token, revalida ao
 * focar a janela (default do provider). Mutações invalidam via os helpers em
 * lib/query-keys.ts.
 */

/** Categorias para a tela de gerência (sistema + custom, com flag editable). */
export function useManagedCategories() {
  const { fetchApi, token } = useApi();
  return useQuery<ManagedCategory[]>({
    queryKey: queryKeys.managedCategories,
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    queryFn: () => fetchApi<ManagedCategory[]>("/categories"),
  });
}

export function useGoals() {
  const { fetchApi, token } = useApi();
  return useQuery<Goal[]>({
    queryKey: queryKeys.goals,
    enabled: Boolean(token),
    queryFn: () => fetchApi<Goal[]>("/goals"),
  });
}

/** Recorrentes paginadas, com filtro opcional por membro da família. */
export function useRecurring(params?: { page?: number; memberId?: string }) {
  const { fetchApi, token } = useApi();
  const page = params?.page ?? 1;
  const memberId = params?.memberId;
  return useQuery<RecurringListResponse>({
    // page/memberId entram na chave para cache por combinação; invalidar pelo
    // prefixo ["recurring"] continua atingindo todas as combinações.
    queryKey: [...queryKeys.recurring, page, memberId ?? null],
    enabled: Boolean(token),
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), perPage: "20" });
      if (memberId) qs.set("memberId", memberId);
      return fetchApi<RecurringListResponse>(`/recurring?${qs.toString()}`);
    },
  });
}

export function useReserves() {
  const { fetchApi, token } = useApi();
  return useQuery<Reserve[]>({
    queryKey: queryKeys.reserves,
    enabled: Boolean(token),
    queryFn: () => fetchApi<Reserve[]>("/reserves"),
  });
}

export interface InvoiceFilters {
  month: string;
  page: number;
  orderBy: string;
  order: string;
  installment?: string;
  categoryId?: string;
  search?: string;
}

/**
 * Fatura de um cartão em um ciclo, com filtros.
 *
 * `placeholderData: keepPreviousData` é o ponto central: trocar mês, página,
 * filtro ou busca mantém a fatura anterior na tela enquanto a nova chega, em
 * vez de colapsar tudo para um "Carregando...". Sem isso, digitar na busca
 * fazia a tela inteira sumir e voltar a cada tecla (o badge, os blocos de
 * pagamento/conferência e a própria paginação some junto, porque todos
 * dependem de `invoice`).
 *
 * Use `isPending` para o primeiro load (não há o que mostrar) e `isFetching`
 * para revalidações (o conteúdo anterior continua na tela).
 */
export function useCardInvoice(cardId: string, filters: InvoiceFilters) {
  const { fetchApi, token } = useApi();
  return useQuery<CardInvoice>({
    queryKey: queryKeys.invoice(cardId, filters),
    enabled: Boolean(token) && Boolean(cardId),
    placeholderData: keepPreviousData,
    queryFn: () => {
      const qs = new URLSearchParams();
      qs.set("month", filters.month);
      qs.set("page", String(filters.page));
      qs.set("perPage", "20");
      qs.set("orderBy", filters.orderBy);
      qs.set("order", filters.order);
      if (filters.installment && filters.installment !== "all") {
        qs.set("installment", filters.installment);
      }
      if (filters.categoryId) qs.set("categoryId", filters.categoryId);
      if (filters.search) qs.set("search", filters.search);
      return fetchApi<CardInvoice>(`/cards/${cardId}/invoice?${qs.toString()}`);
    },
  });
}

export function useInsights() {
  const { fetchApi, token } = useApi();
  return useQuery<InsightsData>({
    queryKey: queryKeys.insights,
    enabled: Boolean(token),
    queryFn: () => fetchApi<InsightsData>("/transactions/insights"),
  });
}
