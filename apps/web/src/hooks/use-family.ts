"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { queryKeys } from "@/lib/query-keys";
import type { Family, FamilyMember } from "@/types/family";

/**
 * Família do usuário (ou null se ele não pertence a nenhuma).
 * GET /families/me já traz members[].user com id+nome.
 */
export function useFamily() {
  const { fetchApi, token } = useApi();
  return useQuery<Family | null>({
    queryKey: queryKeys.family,
    enabled: Boolean(token),
    // Composição de família muda raramente — cache longo evita refetch a cada tela.
    staleTime: 5 * 60_000,
    queryFn: () => fetchApi<Family | null>("/families/me"),
  });
}

/**
 * Lista de membros da família, ordenada com o dono primeiro. Vazia quando o
 * usuário é solo. O seletor de membro só deve aparecer com 2+ membros.
 */
export function useFamilyMembers(): FamilyMember[] {
  const { data: family } = useFamily();
  return family?.members ?? [];
}
