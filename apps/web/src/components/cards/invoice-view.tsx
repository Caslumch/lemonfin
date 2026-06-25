"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CategoryIconWithBg } from "@/components/ui/category-icon";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { logApiError } from "@/lib/log-error";
import type { CardInvoice } from "@/types/card";
import type { Transaction } from "@/types/transaction";

interface InvoiceViewProps {
  cardId: string;
  cardName: string;
  onBack: () => void;
}

type SortKey = "date" | "amount-desc" | "amount-asc" | "alpha";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date", label: "Mais recentes" },
  { value: "amount-desc", label: "Maior valor" },
  { value: "amount-asc", label: "Menor valor" },
  { value: "alpha", label: "A → Z" },
];

function sortTransactions(txs: Transaction[], sort: SortKey): Transaction[] {
  // Cópia antes de ordenar — não muta o array do estado/cache.
  const copy = [...txs];
  switch (sort) {
    case "amount-desc":
      return copy.sort((a, b) => Number(b.amount) - Number(a.amount));
    case "amount-asc":
      return copy.sort((a, b) => Number(a.amount) - Number(b.amount));
    case "alpha":
      return copy.sort((a, b) =>
        (a.description || a.category.name).localeCompare(
          b.description || b.category.name,
          "pt-BR",
          { sensitivity: "base" },
        ),
      );
    case "date":
    default:
      return copy.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
  }
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function InvoiceView({ cardId, cardName, onBack }: InvoiceViewProps) {
  const { fetchApi } = useApi();
  const [invoice, setInvoice] = useState<CardInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [sort, setSort] = useState<SortKey>("date");

  // Ordena no cliente: a fatura já vem inteira do backend (sem paginação), então
  // reordenar é instantâneo e não dispara nova request.
  const sortedTransactions = useMemo(
    () => (invoice ? sortTransactions(invoice.transactions, sort) : []),
    [invoice, sort],
  );

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<CardInvoice>(
        `/cards/${cardId}/invoice?month=${month}`,
      );
      setInvoice(data);
    } catch (error) {
      logApiError("load:invoice", error);
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [fetchApi, cardId, month]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  function navigateMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  const monthLabel = (() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  })();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft size={18} />
        </Button>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
          Fatura — {cardName}
        </h2>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-[20px] border border-border bg-surface shadow-xs px-4 py-3">
        <button
          onClick={() => navigateMonth(-1)}
          className="text-fg-muted hover:text-fg cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium text-fg capitalize">
          {monthLabel}
        </span>
        <button
          onClick={() => navigateMonth(1)}
          className="text-fg-muted hover:text-fg cursor-pointer"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Status badge + ordenação */}
      {invoice && invoice.transactions.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              invoice.isClosed
                ? "bg-danger-muted text-danger"
                : "bg-success-muted text-success"
            }`}
          >
            {invoice.isClosed ? "Fechada" : "Aberta"}
          </span>
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            Ordenar
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border-[1.5px] border-border bg-surface px-2.5 py-1.5 text-xs text-fg transition-colors duration-150 focus:border-fg focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Transactions */}
      {loading ? (
        <div className="rounded-[20px] border border-border bg-surface shadow-xs p-8 text-center">
          <p className="text-fg-muted text-sm">Carregando...</p>
        </div>
      ) : !invoice || invoice.transactions.length === 0 ? (
        <div className="rounded-[20px] border border-border bg-surface shadow-xs p-8 text-center">
          <p className="text-fg-muted text-sm">
            Nenhuma transação neste período.
          </p>
        </div>
      ) : (
        <div className="rounded-[20px] border border-border bg-surface shadow-xs divide-y divide-border">
          {sortedTransactions.map((tx) => {
            // Compra parcelada: total = valor da parcela × nº de parcelas.
            // Mostrado como subtexto discreto (o destaque continua sendo o
            // valor da parcela, que é o que entra nesta fatura).
            const isInstallment =
              (tx.installmentTotal ?? 0) >= 2 &&
              (tx.installmentNumber ?? 0) >= 1;
            const purchaseTotal = isInstallment
              ? Math.round(Number(tx.amount) * tx.installmentTotal! * 100) / 100
              : 0;

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CategoryIconWithBg
                    slug={tx.category.slug}
                    icon={tx.category.icon}
                    colorBg={tx.category.colorBg}
                    colorText={tx.category.colorText}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate">
                      {tx.description || tx.category.name}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {new Date(tx.date).toLocaleDateString("pt-BR", {
                        timeZone: "UTC",
                      })}
                      {isInstallment && (
                        <>
                          {" · "}
                          {tx.installmentNumber}/{tx.installmentTotal} · total{" "}
                          {formatBRL(purchaseTotal)}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-fg shrink-0">
                  {formatBRL(Number(tx.amount))}
                </span>
              </div>
            );
          })}

          {/* Total */}
          <div className="flex items-center justify-between px-4 py-3 bg-subtle">
            <span className="text-sm font-bold text-fg">Total</span>
            <span className="text-sm font-bold text-fg">
              {formatBRL(invoice.total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
