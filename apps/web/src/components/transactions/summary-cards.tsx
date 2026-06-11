"use client";

import { TrendingUp, TrendingDown, Wallet, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransactionSummary } from "@/types/transaction";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

interface SummaryCardsProps {
  summary: TransactionSummary | null;
  loading?: boolean;
}

export function SummaryCards({ summary, loading }: SummaryCardsProps) {
  const cards = [
    {
      label: "Entradas",
      value: summary?.income ?? 0,
      count: summary?.incomeCount ?? 0,
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success-muted",
      dark: false,
    },
    {
      label: "Saídas",
      value: summary?.expense ?? 0,
      count: summary?.expenseCount ?? 0,
      icon: TrendingDown,
      color: "text-danger",
      bg: "bg-danger-muted",
      dark: false,
    },
    {
      label: "Fatura cartão",
      value: summary?.cardExpense ?? 0,
      count: 0,
      icon: CreditCard,
      color: "text-warning",
      bg: "bg-warning-muted",
      dark: false,
    },
    {
      label: "Saldo",
      value: summary?.balance ?? 0,
      count: (summary?.incomeCount ?? 0) + (summary?.expenseCount ?? 0),
      icon: Wallet,
      color: "text-on-dark",
      bg: "bg-white/10",
      dark: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={cn(
              "rounded-[20px] p-5 animate-fade-in-up transition-shadow",
              card.dark
                ? "bg-surface-accent shadow-md"
                : "border border-border bg-surface shadow-xs",
            )}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-20 bg-muted rounded-full" />
                <div className="h-7 w-32 bg-muted rounded-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-[12px] flex items-center justify-center",
                      card.bg,
                    )}
                  >
                    <Icon size={16} className={card.color} />
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      card.dark ? "text-on-dark-muted" : "text-fg-secondary",
                    )}
                  >
                    {card.label}
                  </span>
                </div>
                <p
                  className={cn(
                    "font-[family-name:var(--font-display)] text-xl font-bold tracking-tight",
                    card.dark
                      ? "text-on-dark"
                      : card.color,
                  )}
                >
                  {formatCurrency(card.value)}
                </p>
                <p
                  className={cn(
                    "text-xs mt-1",
                    card.dark ? "text-on-dark-muted" : "text-fg-muted",
                  )}
                >
                  {card.label === "Saldo"
                    ? "este mês"
                    : card.label === "Fatura cartão"
                      ? "aberta"
                      : `${card.count} ${card.count === 1 ? "transação" : "transações"}`}
                </p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
