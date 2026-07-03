"use client";

import { useState, useEffect, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Repeat, Pencil, Trash2, CreditCard } from "lucide-react";
import { CategoryIconWithBg } from "@/components/ui/category-icon";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-button";
import { MemberFilter } from "@/components/filters/member-filter";
import {
  RecurringModal,
  type RecurringFormData,
} from "@/components/recurring/recurring-modal";
import { DeleteRecurringModal } from "@/components/recurring/delete-recurring-modal";
import { useApi } from "@/hooks/use-api";
import { useMemberFilter } from "@/hooks/use-member-filter";
import { useRecurring } from "@/hooks/use-resource-queries";
import { useCategories, useCards } from "@/hooks/use-transactions-data";
import { invalidateRecurring, queryKeys } from "@/lib/query-keys";
import { logApiError } from "@/lib/log-error";
import type { Recurring, RecurringListResponse } from "@/types/recurring";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function RecorrentesPage() {
  // useMemberFilter lê a URL (useSearchParams) — precisa de um boundary Suspense.
  return (
    <Suspense fallback={null}>
      <RecorrentesPageInner />
    </Suspense>
  );
}

function RecorrentesPageInner() {
  const { fetchApi } = useApi();
  const queryClient = useQueryClient();
  const { memberId } = useMemberFilter();
  const [page, setPage] = useState(1);

  // Trocar o membro filtrado (via URL) volta para a página 1. Ajuste de state
  // durante o render (padrão do React) em vez de effect, para não disparar
  // render em cascata.
  const [prevMemberId, setPrevMemberId] = useState(memberId);
  if (memberId !== prevMemberId) {
    setPrevMemberId(memberId);
    setPage(1);
  }

  const recurringQuery = useRecurring({ page, memberId });
  const items = recurringQuery.data?.data ?? [];
  const meta = recurringQuery.data?.meta ?? {
    total: 0,
    totalPages: 1,
    monthlyExpense: 0,
    monthlyIncome: 0,
  };
  const loading = recurringQuery.isPending;
  const { data: categories = [] } = useCategories();
  const { data: cards = [] } = useCards();

  useEffect(() => {
    if (recurringQuery.error)
      logApiError("load:recurring", recurringQuery.error);
  }, [recurringQuery.error]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [deleting, setDeleting] = useState<Recurring | null>(null);

  async function handleCreate(data: RecurringFormData) {
    try {
      await fetchApi("/recurring", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Recorrência criada com sucesso");
      invalidateRecurring(queryClient);
    } catch {
      toast.error("Erro ao criar recorrência");
      throw new Error("create failed");
    }
  }

  async function handleUpdate(data: RecurringFormData) {
    if (!editing) return;
    try {
      await fetchApi(`/recurring/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...data, cardId: data.cardId ?? null }),
      });
      setEditing(null);
      toast.success("Recorrência atualizada");
      invalidateRecurring(queryClient);
    } catch {
      toast.error("Erro ao atualizar recorrência");
      throw new Error("update failed");
    }
  }

  async function handleToggleActive(item: Recurring) {
    const nextActive = !item.active;
    // Entrada exata do cache desta lista (mesma chave do useRecurring).
    const listKey = [...queryKeys.recurring, page, memberId ?? null];

    // Optimistic update: vira o switch NA HORA (sem esperar a request). Guarda o
    // cache atual para reverter se a request falhar.
    await queryClient.cancelQueries({ queryKey: listKey });
    const previous =
      queryClient.getQueryData<RecurringListResponse>(listKey);
    queryClient.setQueryData<RecurringListResponse>(listKey, (old) =>
      old
        ? {
            ...old,
            data: old.data.map((r) =>
              r.id === item.id ? { ...r, active: nextActive } : r,
            ),
          }
        : old,
    );

    try {
      await fetchApi(`/recurring/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: nextActive }),
      });
      // Sincroniza (totais do mês, forecast do painel) sem bloquear o visual.
      invalidateRecurring(queryClient);
    } catch {
      // Falhou: desfaz a mudança visual e avisa.
      if (previous) queryClient.setQueryData(listKey, previous);
      toast.error("Erro ao atualizar recorrência");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await fetchApi(`/recurring/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      toast.success("Recorrência removida");
      invalidateRecurring(queryClient);
    } catch {
      toast.error("Erro ao remover recorrência");
    }
  }

  // Totais vêm agregados do backend (todas as ativas, não só a página atual),
  // para continuarem corretos com a lista paginada.
  const monthlyExpense = meta.monthlyExpense;
  const monthlyIncome = meta.monthlyIncome;

  return (
    <>
      <ContentHeader
        title="Recorrentes"
        actions={
          <>
            {/* Só aparece em família com 2+ membros. */}
            <MemberFilter />
            <RefreshButton
              onRefresh={() => invalidateRecurring(queryClient)}
              refreshing={recurringQuery.isFetching}
            />
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              + Nova recorrente
            </Button>
          </>
        }
      />

      <div className="px-5 pb-8 pt-2 md:px-8 space-y-5">
        {!loading && items.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[20px] border border-border bg-surface shadow-xs p-5">
              <p className="text-xs text-fg-muted mb-1">Despesas fixas / mês</p>
              <p className="text-2xl font-bold text-danger font-[family-name:var(--font-mono)]">
                {formatBRL(monthlyExpense)}
              </p>
            </div>
            <div className="rounded-[20px] border border-border bg-surface shadow-xs p-5">
              <p className="text-xs text-fg-muted mb-1">Receitas fixas / mês</p>
              <p className="text-2xl font-bold text-success font-[family-name:var(--font-mono)]">
                {formatBRL(monthlyIncome)}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-[20px] border border-border bg-surface shadow-xs p-12 text-center">
            <p className="text-fg-muted text-sm">Carregando...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[20px] border border-border bg-surface shadow-xs p-12 text-center">
            <Repeat size={40} className="mx-auto text-fg-muted mb-3" />
            <p className="text-fg-muted text-sm">
              Nenhuma transação recorrente.
            </p>
            <p className="text-fg-muted text-xs mt-1">
              Cadastre contas fixas (aluguel, assinaturas, salário) e o LemonFin
              lança automaticamente todo mês.
            </p>
          </div>
        ) : (
          <div className="rounded-[20px] border border-border bg-surface shadow-xs overflow-hidden">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-5 py-4 ${
                  idx !== items.length - 1 ? "border-b border-border" : ""
                } ${item.active ? "" : "opacity-50"}`}
              >
                <CategoryIconWithBg
                  slug={item.category?.slug}
                  icon={item.category?.icon}
                  colorBg={item.category?.colorBg}
                  colorText={item.category?.colorText}
                />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-fg text-sm truncate">
                    {item.description}
                  </p>
                  <p className="text-xs text-fg-muted flex items-center gap-1.5">
                    {item.category?.name} · todo dia {item.dayOfMonth}
                    {item.businessDayAdjustment === "PREVIOUS" && (
                      <span
                        className="text-lima"
                        title="Antecipa para o dia útil anterior"
                      >
                        · dia útil ↤
                      </span>
                    )}
                    {item.businessDayAdjustment === "NEXT" && (
                      <span
                        className="text-lima"
                        title="Posterga para o dia útil seguinte"
                      >
                        · dia útil ↦
                      </span>
                    )}
                    {item.card && (
                      <>
                        {" · "}
                        <CreditCard size={12} className="inline" />
                        {item.card.name}
                      </>
                    )}
                  </p>
                </div>

                <p
                  className={`text-sm font-bold font-[family-name:var(--font-mono)] ${
                    item.type === "EXPENSE" ? "text-danger" : "text-success"
                  }`}
                >
                  {item.type === "EXPENSE" ? "-" : "+"}
                  {formatBRL(item.amount)}
                </p>

                <button
                  onClick={() => handleToggleActive(item)}
                  title={item.active ? "Pausar" : "Ativar"}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${
                    item.active ? "bg-lima" : "bg-subtle"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      item.active ? "translate-x-4" : ""
                    }`}
                  />
                </button>

                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditing(item);
                      setModalOpen(true);
                    }}
                    className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleting(item)}
                    className="p-1.5 rounded text-fg-muted hover:text-danger hover:bg-danger-muted transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação (mesmo padrão da tela de transações) */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-fg-muted">
              {meta.total} {meta.total === 1 ? "recorrente" : "recorrentes"}
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

      <RecurringModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={editing ? handleUpdate : handleCreate}
        recurring={editing}
        categories={categories}
        cards={cards}
      />

      <DeleteRecurringModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        recurringName={deleting?.description}
      />
    </>
  );
}
