"use client";

import { Wallet, Pencil, TrendingUp, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BudgetStatus } from "@/types/budget";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

interface BudgetCardProps {
  budget: BudgetStatus | null;
  loading?: boolean;
  onEdit: () => void;
}

const PACE_CONFIG = {
  under: {
    label: "abaixo do previsto",
    className: "text-success",
    icon: Check,
  },
  on_track: {
    label: "dentro do previsto",
    className: "text-success",
    icon: Check,
  },
  over: {
    label: "acima do previsto",
    className: "text-danger",
    icon: AlertTriangle,
  },
} as const;

export function BudgetCard({ budget, loading, onEdit }: BudgetCardProps) {
  if (loading) {
    return (
      <div className="rounded-[20px] border border-border bg-surface p-5 shadow-xs animate-fade-in-up">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-28 bg-muted rounded-full" />
          <div className="h-3 w-full bg-muted rounded-full" />
        </div>
      </div>
    );
  }

  if (!budget) return null;

  // Sem orçamento definido para o mês.
  if (budget.amount === null) {
    return (
      <div className="rounded-[20px] border border-border bg-surface p-5 shadow-xs animate-fade-in-up flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] bg-lima-muted flex items-center justify-center shrink-0">
            <Wallet size={18} className="text-lima" />
          </div>
          <div>
            <p className="text-sm font-semibold text-fg">
              Defina seu orçamento do mês
            </p>
            <p className="text-xs text-fg-muted">
              Acompanhe quanto pode gastar e quanto sobra.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={onEdit} className="shrink-0">
          Definir
        </Button>
      </div>
    );
  }

  const pct = Math.min(budget.percentage, 100);
  const barColor = budget.exceeded
    ? "bg-danger"
    : budget.percentage >= 80
      ? "bg-warning"
      : "bg-lima";
  const pace = PACE_CONFIG[budget.pace];
  const PaceIcon = pace.icon;

  return (
    <div className="rounded-[20px] border border-border bg-surface p-5 shadow-xs animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-lima" />
          <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-fg">
            Orçamento do mês
          </h3>
        </div>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-[10px] text-fg-muted hover:text-fg hover:bg-subtle transition-colors cursor-pointer"
          title="Editar orçamento"
        >
          <Pencil size={14} />
        </button>
      </div>

      {/* Valores */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="font-[family-name:var(--font-mono)] text-2xl font-bold text-fg">
            {formatCurrency(budget.spent)}
          </p>
          <p className="text-xs text-fg-muted">
            de {formatCurrency(budget.amount)}
          </p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "text-sm font-semibold",
              budget.exceeded ? "text-danger" : "text-success",
            )}
          >
            {budget.exceeded
              ? `${formatCurrency(Math.abs(budget.remaining))} acima`
              : `${formatCurrency(budget.remaining)} restante`}
          </p>
          <p className="text-xs text-fg-muted">
            {budget.daysRemaining > 0
              ? `${budget.daysRemaining} ${budget.daysRemaining === 1 ? "dia" : "dias"} restantes`
              : "último dia"}
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="w-full h-2.5 bg-subtle rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Ritmo */}
      <div className="flex items-center gap-1.5 mt-3">
        <PaceIcon size={13} className={pace.className} />
        <span className={cn("text-xs font-medium", pace.className)}>
          Ritmo {pace.label}
        </span>
        <span className="text-xs text-fg-muted">
          · projeção {formatCurrency(budget.projectedSpend)}
        </span>
        {budget.pace === "over" && (
          <TrendingUp size={12} className="text-danger ml-auto" />
        )}
      </div>
    </div>
  );
}
