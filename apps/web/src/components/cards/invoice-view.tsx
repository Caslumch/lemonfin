"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CategoryIconWithBg } from "@/components/ui/category-icon";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import type { CardInvoice } from "@/types/card";

interface InvoiceViewProps {
  cardId: string;
  cardName: string;
  onBack: () => void;
}

export function InvoiceView({ cardId, cardName, onBack }: InvoiceViewProps) {
  const { fetchApi } = useApi();
  const [invoice, setInvoice] = useState<CardInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<CardInvoice>(
        `/cards/${cardId}/invoice?month=${month}`,
      );
      setInvoice(data);
    } catch {
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
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
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

      {/* Status badge */}
      {invoice && (
        <div className="flex justify-end">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              invoice.isClosed
                ? "bg-danger-muted text-danger"
                : "bg-success-muted text-success"
            }`}
          >
            {invoice.isClosed ? "Fechada" : "Aberta"}
          </span>
        </div>
      )}

      {/* Transactions */}
      {loading ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-fg-muted text-sm">Carregando...</p>
        </div>
      ) : !invoice || invoice.transactions.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-fg-muted text-sm">
            Nenhuma transacao neste periodo.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface divide-y divide-border">
          {invoice.transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <CategoryIconWithBg
                  slug={tx.category.slug}
                  colorBg={tx.category.colorBg}
                  colorText={tx.category.colorText}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg truncate">
                    {tx.description || tx.category.name}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {new Date(tx.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-fg shrink-0">
                {Number(tx.amount).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
          ))}

          {/* Total */}
          <div className="flex items-center justify-between px-4 py-3 bg-subtle">
            <span className="text-sm font-bold text-fg">Total</span>
            <span className="text-sm font-bold text-fg">
              {invoice.total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
