"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  // Ação de retentar (normalmente o `refetch` do React Query).
  onRetry?: () => void;
  // Título/descrição opcionais — os defaults servem para a maioria das telas.
  title?: string;
  description?: string;
  // Indica que a nova tentativa está em andamento (desabilita o botão).
  retrying?: boolean;
}

/**
 * Estado de ERRO de carregamento, reutilizável. Num app financeiro é essencial
 * DIFERENCIAR falha de rede/API de "conta vazia": sem isto, uma tela em erro
 * mostra tudo R$ 0,00 / "nenhuma transação" e o usuário acha que perdeu dados.
 * Aqui deixamos claro que houve um problema e oferecemos "Tentar novamente".
 */
export function ErrorState({
  onRetry,
  title = "Não foi possível carregar",
  description = "Tivemos um problema ao buscar seus dados. Verifique sua conexão e tente de novo.",
  retrying,
}: ErrorStateProps) {
  return (
    <div className="rounded-[20px] border border-border bg-surface shadow-xs p-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-danger-muted">
        <AlertTriangle size={22} className="text-danger" />
      </div>
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="mt-1 text-xs text-fg-muted max-w-sm mx-auto">
        {description}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={retrying}
          className="mt-4 inline-flex items-center gap-1.5"
        >
          <RotateCw
            size={14}
            className={retrying ? "animate-spin" : undefined}
          />
          {retrying ? "Tentando..." : "Tentar novamente"}
        </Button>
      )}
    </div>
  );
}
