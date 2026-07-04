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

function formatTime(createdAt: string) {
  // Horário REAL do registro vem de createdAt (a `date` é meio-dia UTC e não
  // carrega a hora do gasto). Exibido no fuso local (Brasil), formato 24h.
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

// Compra parcelada agrupada: a transação é a 1ª parcela representando a compra
// inteira (tem installmentTotal >= 2 e a soma das parcelas em installmentSum).
function isGroupedInstallment(tx: Transaction): boolean {
  return (tx.installmentTotal ?? 0) >= 2 && tx.installmentSum != null;
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

        // Pagamento de fatura NÃO é gasto de consumo — é quitação de compras já
        // feitas no cartão. Renderiza como uma transferência (cor neutra, sem o
        // vermelho/"-" de despesa) para não parecer um gasto novo e não brigar
        // com o card "Saídas" (que o trata à parte).
        const isInvoicePayment = slug === "pagamento-fatura";

        // Linha de compra parcelada agrupada: mostra "Nx", valor TOTAL da compra
        // e o valor de cada parcela no subtexto. À vista segue normal.
        const grouped = isGroupedInstallment(tx);
        const total = tx.installmentTotal ?? 0;
        const displayAmount = grouped ? tx.installmentSum! : Number(tx.amount);
        const baseDescription = tx.description || tx.category.name;
        const displayDescription = grouped
          ? `${baseDescription} ${total}x`
          : baseDescription;

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
                {displayDescription}
              </p>
              <div className="text-xs text-fg-muted mt-0.5 flex items-center gap-1 flex-wrap">
                <span>
                  {/* Em compra parcelada, a hora (createdAt) é do registro da 1ª
                      parcela e não da compra — mostra só a data (da compra). */}
                  {formatDate(tx.date)}
                  {!grouped && ` · ${formatTime(tx.createdAt)}`}
                </span>
                {grouped && (
                  <span>
                    · {total}x de {formatCurrency(Number(tx.amount))}
                  </span>
                )}
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
                isInvoicePayment
                  ? "text-fg-muted"
                  : tx.type === "INCOME"
                    ? "text-success"
                    : "text-danger",
              )}
            >
              {isInvoicePayment ? "" : tx.type === "INCOME" ? "+" : "-"}{" "}
              {formatCurrency(displayAmount)}
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
