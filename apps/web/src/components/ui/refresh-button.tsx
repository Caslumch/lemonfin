"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  /** Dispara a revalidação. Normalmente o `refetch` de um useQuery. */
  onRefresh: () => void;
  /** Quando true, o ícone gira e o botão fica desabilitado. */
  refreshing?: boolean;
  className?: string;
}

/**
 * Botão discreto para recarregar os dados da tela sem dar F5.
 * Usado ao lado do título/avatar nas telas que usam React Query.
 */
export function RefreshButton({
  onRefresh,
  refreshing = false,
  className,
}: RefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      aria-label="Recarregar"
      title="Recarregar"
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full text-fg-secondary transition-colors hover:bg-subtle hover:text-fg active:bg-muted disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <RefreshCw size={17} className={cn(refreshing && "animate-spin")} />
    </button>
  );
}
