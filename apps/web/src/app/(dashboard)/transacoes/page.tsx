"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { SummaryCards } from "@/components/transactions/summary-cards";
import { TransactionList } from "@/components/transactions/transaction-list";
import { TransactionModal } from "@/components/transactions/transaction-modal";
import { DeleteModal } from "@/components/transactions/delete-modal";
import { FiltersBar } from "@/components/transactions/filters-bar";
import { useApi } from "@/hooks/use-api";
import type {
  Transaction,
  TransactionSummary,
  Category,
  PaginatedResponse,
} from "@/types/transaction";
import type { Card } from "@/types/card";

export default function TransacoesPage() {
  const { fetchApi } = useApi();

  // Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });

  // Loading
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Filters
  const [type, setType] = useState("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  // Fetch categories and cards once
  useEffect(() => {
    fetchApi<Category[]>("/categories").then(setCategories).catch(() => {});
    fetchApi<Card[]>("/cards").then(setCards).catch(() => {});
  }, [fetchApi]);

  // Build query params (shared between fetch and poll)
  const buildTransactionParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("perPage", "20");
    if (type !== "ALL") params.set("type", type);
    if (categoryId) params.set("categoryId", categoryId);
    if (startDate)
      params.set("startDate", new Date(startDate + "T00:00:00").toISOString());
    if (endDate)
      params.set("endDate", new Date(endDate + "T23:59:59").toISOString());
    return params;
  }, [page, type, categoryId, startDate, endDate]);

  const buildSummaryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (startDate)
      params.set("startDate", new Date(startDate + "T00:00:00").toISOString());
    if (endDate)
      params.set("endDate", new Date(endDate + "T23:59:59").toISOString());
    return params;
  }, [startDate, endDate]);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildTransactionParams();
      const res = await fetchApi<PaginatedResponse<Transaction>>(
        `/transactions?${params.toString()}`,
      );
      setTransactions(res.data);
      setMeta(res.meta);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [fetchApi, buildTransactionParams]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const qs = buildSummaryParams().toString();
      const res = await fetchApi<TransactionSummary>(
        `/transactions/summary${qs ? `?${qs}` : ""}`,
      );
      setSummary(res);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [fetchApi, buildSummaryParams]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Silent polling every 30s — updates data without showing loading spinners
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const params = buildTransactionParams();
        const res = await fetchApi<PaginatedResponse<Transaction>>(
          `/transactions?${params.toString()}`,
        );
        setTransactions(res.data);
        setMeta(res.meta);

        const qs = buildSummaryParams().toString();
        const summaryRes = await fetchApi<TransactionSummary>(
          `/transactions/summary${qs ? `?${qs}` : ""}`,
        );
        setSummary(summaryRes);
      } catch {
        // Silent fail — next poll will retry
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [fetchApi, buildTransactionParams, buildSummaryParams]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [type, categoryId, startDate, endDate]);

  // Handlers
  async function handleCreate(data: {
    amount: number;
    type: "INCOME" | "EXPENSE";
    description?: string;
    date?: string;
    categoryId: string;
    cardId?: string;
  }) {
    try {
      await fetchApi("/transactions", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Transacao criada com sucesso");
      fetchTransactions();
      fetchSummary();
    } catch {
      toast.error("Erro ao criar transacao");
      throw new Error("create failed");
    }
  }

  async function handleUpdate(data: {
    amount: number;
    type: "INCOME" | "EXPENSE";
    description?: string;
    date?: string;
    categoryId: string;
    cardId?: string;
  }) {
    if (!editingTx) return;
    try {
      await fetchApi(`/transactions/${editingTx.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setEditingTx(null);
      toast.success("Transacao atualizada");
      fetchTransactions();
      fetchSummary();
    } catch {
      toast.error("Erro ao atualizar transacao");
      throw new Error("update failed");
    }
  }

  async function handleDelete() {
    if (!deletingTx) return;
    try {
      await fetchApi(`/transactions/${deletingTx.id}`, {
        method: "DELETE",
      });
      setDeletingTx(null);
      toast.success("Transacao excluida");
      fetchTransactions();
      fetchSummary();
    } catch {
      toast.error("Erro ao excluir transacao");
    }
  }

  return (
    <>
      <ContentHeader
        title="Transacoes"
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            + Nova transacao
          </Button>
        }
      />

      <div className="p-5 md:p-7 space-y-5">
        {/* Summary cards */}
        <SummaryCards summary={summary} loading={summaryLoading} />

        {/* Filters */}
        <FiltersBar
          type={type}
          onTypeChange={setType}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          categories={categories}
        />

        {/* Transaction list */}
        <TransactionList
          transactions={transactions}
          loading={loading}
          onEdit={(tx) => {
            setEditingTx(tx);
            setModalOpen(true);
          }}
          onDelete={setDeletingTx}
        />

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-fg-muted">
              {meta.total} {meta.total === 1 ? "transacao" : "transacoes"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="flex items-center text-sm text-fg-secondary px-2">
                {page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Proximo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      <TransactionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTx(null);
        }}
        onSubmit={editingTx ? handleUpdate : handleCreate}
        transaction={editingTx}
        categories={categories}
        cards={cards}
      />

      {/* Delete confirmation */}
      <DeleteModal
        open={!!deletingTx}
        onClose={() => setDeletingTx(null)}
        onConfirm={handleDelete}
        description={deletingTx?.description}
      />
    </>
  );
}
