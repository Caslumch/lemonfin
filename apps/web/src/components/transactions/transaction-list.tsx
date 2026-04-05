"use client";

import { Pencil, Trash2 } from "lucide-react";
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
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
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
            className="animate-pulse rounded-lg border border-border bg-surface p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-md bg-muted" />
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
      <div className="rounded-lg border border-border bg-surface p-12 text-center">
        <p className="text-fg-muted text-sm">
          Nenhuma transacao encontrada.
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
            className="rounded-lg border border-border bg-surface px-4 py-3 flex items-center gap-4 hover:border-fg-muted transition-colors animate-fade-in-up"
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
              <p className="text-xs text-fg-muted mt-0.5">
                {formatDate(tx.date)}
                {tx.source === "WHATSAPP" && " · via WhatsApp"}
              </p>
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
