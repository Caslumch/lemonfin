"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  // Frase curta de benefício: o que o usuário ganha ao usar o recurso.
  description?: string;
  // CTA principal no corpo (não só no header) — o que faz a tela deixar de ser
  // um beco sem saída para quem nunca configurou o recurso.
  actionLabel?: string;
  onAction?: () => void;
  // Dica secundária opcional (ex.: "ou peça pelo WhatsApp").
  hint?: string;
}

/**
 * Estado VAZIO com chamada para ação. Diferente de um vazio "morto" (só texto),
 * orienta o usuário a dar o primeiro passo — padrão de onboarding de apps de
 * mercado. Reaproveita o visual do empty de Cartões, adicionando o CTA no corpo.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  hint,
}: EmptyStateProps) {
  return (
    <div className="rounded-[20px] border border-border bg-surface shadow-xs p-12 text-center">
      <Icon size={40} className="mx-auto text-fg-muted mb-3" />
      <p className="text-fg text-sm font-medium">{title}</p>
      {description && (
        <p className="text-fg-muted text-xs mt-1 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
      {hint && <p className="text-fg-muted text-xs mt-3">{hint}</p>}
    </div>
  );
}
