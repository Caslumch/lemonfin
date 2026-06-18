"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const PARAM = "membro";

/**
 * Estado do filtro "por membro da família", guardado na URL (?membro=<id>).
 *
 * Manter na URL (em vez de state local) faz o filtro ser global ao dashboard,
 * sobreviver a refresh e ser compartilhável. Quem consome passa `memberId`
 * adiante para os hooks de dados (que o enviam à API e o incluem na queryKey).
 *
 * Componentes que usam este hook precisam estar sob um <Suspense> (exigência do
 * useSearchParams em páginas que podem ser pré-renderizadas).
 */
export function useMemberFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const memberId = searchParams.get(PARAM) ?? undefined;

  const setMemberId = useCallback(
    (id: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set(PARAM, id);
      else params.delete(PARAM);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );

  return { memberId, setMemberId };
}
