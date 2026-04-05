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
    },
    {
      label: "Saidas",
      value: summary?.expense ?? 0,
      count: summary?.expenseCount ?? 0,
      icon: TrendingDown,
      color: "text-danger",
      bg: "bg-danger-muted",
    },
    {
      label: "Fatura cartao",
      value: summary?.cardExpense ?? 0,
      count: 0,
      icon: CreditCard,
      color: "text-warning",
      bg: "bg-warning-muted",
    },
    {
      label: "Saldo",
      value: summary?.balance ?? 0,
      count: (summary?.incomeCount ?? 0) + (summary?.expenseCount ?? 0),
      icon: Wallet,
      color: "text-fg",
      bg: "bg-muted",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-surface p-5 animate-fade-in-up"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-7 w-32 bg-muted rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-md flex items-center justify-center",
                      card.bg,
                    )}
                  >
                    <Icon size={16} className={card.color} />
                  </div>
                  <span className="text-sm text-fg-secondary">{card.label}</span>
                </div>
                <p
                  className={cn(
                    "font-[family-name:var(--font-display)] text-xl font-bold",
                    card.label === "Saldo"
                      ? card.value >= 0
                        ? "text-success"
                        : "text-danger"
                      : card.color,
                  )}
                >
                  {formatCurrency(card.value)}
                </p>
                <p className="text-xs text-fg-muted mt-1">
                  {card.count} {card.count === 1 ? "transacao" : "transacoes"}
                </p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
