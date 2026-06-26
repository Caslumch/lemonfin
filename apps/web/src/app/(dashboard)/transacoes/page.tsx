"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-button";
import { SummaryCards } from "@/components/transactions/summary-cards";
import { TransactionList } from "@/components/transactions/transaction-list";
import { TransactionModal } from "@/components/transactions/transaction-modal";
import { DeleteModal } from "@/components/transactions/delete-modal";
import { FiltersBar, type SortValue } from "@/components/transactions/filters-bar";
import { MemberFilter } from "@/components/filters/member-filter";
import { useApi } from "@/hooks/use-api";
import { useMemberFilter } from "@/hooks/use-member-filter";
import {
  useTransactionsList,
  useTransactionsSummary,
  useCategories,
  useCards,
} from "@/hooks/use-transactions-data";
import { invalidateTransactionData } from "@/lib/query-keys";
import { logApiError } from "@/lib/log-error";
import type { Transaction } from "@/types/transaction";

export default function TransacoesPage() {
  // useMemberFilter lê a URL (useSearchParams) — precisa de um boundary Suspense.
  return (
    <Suspense fallback={null}>
      <TransacoesPageInner />
    </Suspense>
  );
}

function TransacoesPageInner() {
  const { fetchApi } = useApi();
  const queryClient = useQueryClient();
  const { memberId } = useMemberFilter();

  // Filters
  const [type, setType] = useState("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortValue>("date:desc");
  const [page, setPage] = useState(1);

  // Debounce search input so we don't fire a request per keystroke.
  // Voltar para a página 1 ao mudar a busca acompanha o debounce.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Trocar o membro filtrado (via URL) volta para a página 1. Ajuste de state
  // durante o render (padrão do React) — alinhado ao restante da tela, que
  // também reseta a página fora de effects para evitar render em cascata.
  const [prevMemberId, setPrevMemberId] = useState(memberId);
  if (memberId !== prevMemberId) {
    setPrevMemberId(memberId);
    setPage(1);
  }

  // Mudar tipo/categoria/mês também volta para a página 1. Fazemos isso nos
  // próprios setters (não num effect) para evitar render em cascata.
  function changeType(value: string) {
    setType(value);
    setPage(1);
  }
  function changeCategory(value: string) {
    setCategoryId(value);
    setPage(1);
  }
  function changeMonth(value: Date) {
    setMonth(value);
    setPage(1);
  }
  function changeSort(value: SortValue) {
    setSort(value);
    setPage(1);
  }

  // Start/end of the selected month as ISO (local boundaries)
  const monthRange = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return { start: start.toISOString(), end: end.toISOString() };
  }, [month]);

  // "campo:direção" → orderBy/order para a API.
  const [orderBy, order] = sort.split(":") as [
    "date" | "amount",
    "asc" | "desc",
  ];

  // Data (React Query) — cache por combinação de filtros, com revalidação
  const filters = {
    page,
    type,
    categoryId,
    search: debouncedSearch,
    startDate: monthRange.start,
    endDate: monthRange.end,
    memberId,
    orderBy,
    order,
  };
  const listQuery = useTransactionsList(filters);
  const summaryQuery = useTransactionsSummary(monthRange);
  const { data: categories = [] } = useCategories();
  const { data: cards = [] } = useCards();

  const transactions = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta ?? { total: 0, page: 1, totalPages: 1 };
  const summary = summaryQuery.data ?? null;
  const loading = listQuery.isPending;
  const summaryLoading = summaryQuery.isPending;
  const isFetching = listQuery.isFetching || summaryQuery.isFetching;

  useEffect(() => {
    if (listQuery.error) logApiError("load:transactions", listQuery.error);
    if (summaryQuery.error) logApiError("load:summary", summaryQuery.error);
  }, [listQuery.error, summaryQuery.error]);

  function refresh() {
    invalidateTransactionData(queryClient);
  }

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  // Handlers — toda mutação invalida lista, resumo E painel.
  async function handleCreate(data: {
    amount: number;
    type: "INCOME" | "EXPENSE";
    description?: string;
    date?: string;
    categoryId: string;
    cardId?: string;
    installments?: number;
    editGroup?: boolean;
  }) {
    try {
      // editGroup só faz sentido na edição; não vai no POST de criação.
      const { editGroup: _editGroup, ...rest } = data;
      void _editGroup;
      await fetchApi("/transactions", {
        method: "POST",
        body: JSON.stringify(rest),
      });
      toast.success("Transação criada com sucesso");
      invalidateTransactionData(queryClient);
    } catch {
      toast.error("Erro ao criar transação");
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
    installments?: number;
    editGroup?: boolean;
  }) {
    if (!editingTx) return;
    try {
      // Edição de compra parcelada inteira: scope=group recria todas as parcelas
      // (o backend espera amount=total, installments e date=1ª parcela). O resto
      // dos campos da edição avulsa (type) não vai nesse payload.
      const { editGroup, ...rest } = data;
      const path = editGroup
        ? `/transactions/${editingTx.id}?scope=group`
        : `/transactions/${editingTx.id}`;
      await fetchApi(path, {
        method: "PATCH",
        body: JSON.stringify(rest),
      });
      setEditingTx(null);
      toast.success(editGroup ? "Parcelas atualizadas" : "Transação atualizada");
      invalidateTransactionData(queryClient);
    } catch {
      toast.error("Erro ao atualizar transação");
      throw new Error("update failed");
    }
  }

  async function handleDelete(scope: "single" | "group") {
    if (!deletingTx) return;
    try {
      const qs = scope === "group" ? "?scope=group" : "";
      await fetchApi(`/transactions/${deletingTx.id}${qs}`, {
        method: "DELETE",
      });
      setDeletingTx(null);
      toast.success(
        scope === "group" ? "Parcelas excluídas" : "Transação excluída",
      );
      invalidateTransactionData(queryClient);
    } catch (error) {
      toast.error("Erro ao excluir transação");
      // Re-lança para o modal NÃO fechar em caso de falha (mantém aberto para
      // nova tentativa); sem isso o handleConfirm chamaria onClose() mesmo no erro.
      throw error;
    }
  }

  return (
    <>
      <ContentHeader
        title="Transações"
        actions={
          <>
            <RefreshButton onRefresh={refresh} refreshing={isFetching} />
            <Button onClick={() => setModalOpen(true)} className="gap-1.5">
              <Plus size={18} />
              Nova transação
            </Button>
          </>
        }
      />

      <div className="px-5 pb-8 pt-2 md:px-8 space-y-5">
        {/* Summary cards */}
        <SummaryCards summary={summary} month={month} loading={summaryLoading} />

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <FiltersBar
            type={type}
            onTypeChange={changeType}
            categoryId={categoryId}
            onCategoryChange={changeCategory}
            month={month}
            onMonthChange={changeMonth}
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={changeSort}
            categories={categories}
          />
          {/* Só renderiza algo quando o usuário está em família com 2+ membros. */}
          <MemberFilter />
        </div>

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
              {meta.total} {meta.total === 1 ? "transação" : "transações"}
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
                Próximo
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
        installmentTotal={deletingTx?.installmentTotal}
      />
    </>
  );
}
