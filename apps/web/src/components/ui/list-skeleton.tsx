"use client";

interface ListSkeletonProps {
  // Quantas linhas-fantasma renderizar (default 4).
  rows?: number;
}

/**
 * Skeleton de carregamento para listas — pulso cinza no formato de uma linha de
 * item, no lugar do texto "Carregando...". Padroniza o loading com o dashboard/
 * transações/insights (que já usam pulse), em vez de texto solto.
 */
export function ListSkeleton({ rows = 4 }: ListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-[20px] border border-border bg-surface p-4 flex items-center gap-4"
        >
          <div className="h-10 w-10 rounded-[12px] bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-5 w-20 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
