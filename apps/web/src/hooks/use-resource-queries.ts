"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { queryKeys } from "@/lib/query-keys";
import type { InsightsData } from "@/types/transaction";
import type { ManagedCategory } from "@/types/category";
import type { Goal } from "@/types/goal";
import type { Recurring } from "@/types/recurring";
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

export function useRecurring() {
  const { fetchApi, token } = useApi();
  return useQuery<Recurring[]>({
    queryKey: queryKeys.recurring,
    enabled: Boolean(token),
    queryFn: () => fetchApi<Recurring[]>("/recurring"),
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

export function useInsights() {
  const { fetchApi, token } = useApi();
  return useQuery<InsightsData>({
    queryKey: queryKeys.insights,
    enabled: Boolean(token),
    queryFn: () => fetchApi<InsightsData>("/transactions/insights"),
  });
}
