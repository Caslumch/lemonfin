"use client";

import { Pencil, Trash2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/types/transaction";
import type { BadgeProps } from "@/components/ui/badge";

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function formatDate(date: string) {
  // Formata em UTC, não no fuso do navegador. As datas são gravadas ancoradas
  // ao meio-dia UTC; formatar em fuso local (Brasil, UTC-3) puxaria datas
  // próximas da meia-noite para o dia anterior — e divergiria do dia que o
  // modal de edição mostra (ele faz slice(0,10) da string, sem fuso).
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(date));
}

type CategorySlug =
  | "alimentacao"
  | "transporte"
  | "moradia"
  | "saude"
  | "lazer"
  | "educacao"
  | "compras"
  | "salario"
  | "freelance"
  | "outros";

const validSlugs = new Set<string>([
  "alimentacao",
  "transporte",
  "moradia",
  "saude",
  "lazer",
  "educacao",
  "compras",
  "salario",
  "freelance",
  "outros",
]);

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionList({
  transactions,
  loading,
  onEdit,
  onDelete,
}: TransactionListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-[20px] border border-border bg-surface p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-[12px] bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
            <div className="h-5 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-[20px] border border-border bg-surface p-12 text-center">
        <p className="text-fg-muted text-sm">
          Nenhuma transação encontrada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx, index) => {
        const slug = tx.category.slug;
        const isValidSlug = validSlugs.has(slug);

        return (
          <div
            key={tx.id}
            className="rounded-[20px] border border-border bg-surface px-4 py-3.5 flex items-center gap-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Category badge */}
            <div className="shrink-0">
              {isValidSlug ? (
                <Badge category={slug as CategorySlug}>
                  {tx.category.name}
                </Badge>
              ) : (
                <Badge category="outros">{tx.category.name}</Badge>
              )}
            </div>

            {/* Description + date */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-fg truncate">
                {tx.description || tx.category.name}
              </p>
              <div className="text-xs text-fg-muted mt-0.5 flex items-center gap-1 flex-wrap">
                <span>{formatDate(tx.date)}</span>
                {tx.user?.name && (
                  <span>· {tx.user.name.split(" ")[0]}</span>
                )}
                {tx.source === "WHATSAPP" && <span>· via WhatsApp</span>}
                {tx.card && (
                  <span className="inline-flex items-center gap-1 text-fg-secondary">
                    ·
                    <CreditCard size={12} className="shrink-0" />
                    {tx.card.name}
                  </span>
                )}
              </div>
            </div>

            {/* Amount */}
            <p
              className={cn(
                "font-[family-name:var(--font-mono)] text-sm font-medium shrink-0",
                tx.type === "INCOME" ? "text-success" : "text-danger",
              )}
            >
              {tx.type === "INCOME" ? "+" : "-"}{" "}
              {formatCurrency(tx.amount)}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(tx)}
                className="p-1.5 text-fg-muted hover:text-fg rounded-md hover:bg-subtle transition-colors cursor-pointer"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(tx)}
                className="p-1.5 text-fg-muted hover:text-danger rounded-md hover:bg-subtle transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
