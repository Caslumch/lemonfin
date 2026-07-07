"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  CalendarClock,
  ChevronDown,
} from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils";
import { formatBRL as formatCurrency } from "@/lib/format";
import type { Forecast } from "@/types/forecast";

interface ForecastCardProps {
  forecast: Forecast | null;
  loading?: boolean;
}

export function ForecastCard({ forecast, loading }: ForecastCardProps) {
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="rounded-[20px] bg-surface-accent p-5 shadow-md animate-fade-in-up">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-white/15 rounded-full" />
          <div className="h-9 w-44 bg-white/15 rounded-full" />
        </div>
      </div>
    );
  }

  if (!forecast) return null;

  const positive = forecast.projectedBalance >= 0;
  const hasPending = forecast.pending.length > 0;

  return (
    <div className="rounded-[20px] bg-surface-accent p-5 shadow-md animate-fade-in-up">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <CalendarClock size={16} className="text-on-dark-muted" />
            <p className="text-sm text-on-dark-muted">Previsão de fim do mês</p>
          </div>
          <p
            className={cn(
              "font-[family-name:var(--font-display)] text-[34px] leading-none font-bold tracking-tight",
              positive ? "text-lima" : "text-danger",
            )}
          >
            {formatCurrency(forecast.projectedBalance)}
          </p>
          <p className="text-xs text-on-dark-muted mt-2">
            {forecast.daysRemaining > 0
              ? `faltam ${forecast.daysRemaining} ${forecast.daysRemaining === 1 ? "dia" : "dias"} no mês`
              : "último dia do mês"}
          </p>
        </div>

        {hasPending && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-on-dark-muted hover:text-on-dark transition-colors cursor-pointer shrink-0"
          >
            Detalhes
            <ChevronDown
              size={14}
              className={cn("transition-transform", open && "rotate-180")}
            />
          </button>
        )}
      </div>

      {/* Breakdown resumido */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-sm">
        <span className="text-on-dark-muted">
          Saldo hoje:{" "}
          <span className="text-on-dark font-medium">
            {formatCurrency(forecast.currentBalance)}
          </span>
        </span>
        {forecast.pendingIncome > 0 && (
          <span className="text-success font-medium">
            + {formatCurrency(forecast.pendingIncome)} a receber
          </span>
        )}
        {forecast.pendingExpense > 0 && (
          <span className="text-danger font-medium">
            − {formatCurrency(forecast.pendingExpense)} a pagar
          </span>
        )}
        {forecast.estimatedVariableExpense > 0 && (
          <span className="text-danger font-medium">
            − {formatCurrency(forecast.estimatedVariableExpense)} gastos
            estimados
          </span>
        )}
      </div>

      {forecast.estimatedVariableExpense > 0 && (
        <p className="text-[11px] text-on-dark-muted/70 mt-2 leading-snug">
          Inclui ~{formatCurrency(forecast.estimatedVariableExpense)} de gastos
          variáveis estimados pela sua média de{" "}
          {formatCurrency(forecast.avgDailyVariableExpense)}/dia.
        </p>
      )}

      {/* Detalhe das recorrências pendentes */}
      {open && hasPending && (
        <div className="mt-5 pt-5 border-t border-white/10 space-y-2.5">
          <p className="text-xs text-on-dark-muted mb-1">Ainda neste mês</p>
          {forecast.pending.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-[10px] bg-white/10 flex items-center justify-center shrink-0">
                <CategoryIcon
                  slug={p.category?.slug}
                  icon={p.category?.icon}
                  size={14}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-on-dark truncate">{p.description}</p>
                <p className="text-xs text-on-dark-muted">dia {p.dayOfMonth}</p>
              </div>
              <span
                className={cn(
                  "font-[family-name:var(--font-mono)] text-sm font-medium shrink-0 flex items-center gap-1",
                  p.type === "INCOME" ? "text-success" : "text-danger",
                )}
              >
                {p.type === "INCOME" ? (
                  <TrendingUp size={13} />
                ) : (
                  <TrendingDown size={13} />
                )}
                {p.type === "INCOME" ? "+" : "−"} {formatCurrency(p.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {!hasPending && (
        <p className="text-xs text-on-dark-muted mt-3">
          Sem contas fixas previstas para o resto do mês.
        </p>
      )}
    </div>
  );
}
