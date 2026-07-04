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

function isCurrentMonth(month: Date) {
  const now = new Date();
  return (
    month.getFullYear() === now.getFullYear() &&
    month.getMonth() === now.getMonth()
  );
}

// "este mês" quando for o mês corrente, senão "Maio de 2026"
function monthLabel(month: Date) {
  if (isCurrentMonth(month)) {
    return "este mês";
  }
  const label = month.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface SummaryCardsProps {
  summary: TransactionSummary | null;
  month: Date;
  loading?: boolean;
}

export function SummaryCards({ summary, month, loading }: SummaryCardsProps) {
  const income = summary?.income ?? 0;
  const expense = summary?.expense ?? 0;
  const invoicePayment = summary?.invoicePayment ?? 0;
  // "Saídas" = tudo que saiu do CAIXA no período: consumo (pix/débito) + o
  // pagamento de fatura. Assim Entradas − Saídas = Saldo fecha (antes o
  // pagamento de fatura sumia e a conta não batia). O gasto no cartão não entra
  // aqui — vira a fatura (card ao lado), paga depois.
  const outflow = expense + invoicePayment;
  const outflowCount = summary?.expenseCount ?? 0;

  const cards = [
    {
      label: "Entradas",
      value: income,
      count: summary?.incomeCount ?? 0,
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success-muted",
      dark: false,
      // subtítulo: nº de lançamentos
      sub: null as string | null,
    },
    {
      label: "Saídas",
      value: outflow,
      count: outflowCount,
      icon: TrendingDown,
      color: "text-danger",
      bg: "bg-danger-muted",
      dark: false,
      // Quando houve pagamento de fatura, explica que ele está incluído.
      sub:
        invoicePayment > 0
          ? `inclui ${formatCurrency(invoicePayment)} de fatura`
          : null,
    },
    {
      label: "Fatura cartão",
      value: summary?.cardInvoice ?? 0,
      count: 0,
      icon: CreditCard,
      color: "text-warning",
      bg: "bg-warning-muted",
      dark: false,
      // "aberta" só faz sentido no mês corrente; num mês passado a fatura desse
      // ciclo já fechou/foi paga, então mostramos o rótulo do ciclo.
      sub: isCurrentMonth(month) ? "aberta" : "do ciclo",
    },
    {
      label: "Saldo",
      value: summary?.balance ?? 0,
      count: (summary?.incomeCount ?? 0) + (summary?.expenseCount ?? 0),
      icon: Wallet,
      color: "text-on-dark",
      bg: "bg-white/10",
      dark: true,
      sub: null,
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
                    ? monthLabel(month)
                    : card.sub
                      ? card.sub
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
