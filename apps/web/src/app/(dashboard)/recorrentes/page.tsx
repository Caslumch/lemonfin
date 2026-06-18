"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Repeat, Pencil, Trash2, CreditCard } from "lucide-react";
import { CategoryIconWithBg } from "@/components/ui/category-icon";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-button";
import {
  RecurringModal,
  type RecurringFormData,
} from "@/components/recurring/recurring-modal";
import { DeleteRecurringModal } from "@/components/recurring/delete-recurring-modal";
import { useApi } from "@/hooks/use-api";
import { useRecurring } from "@/hooks/use-resource-queries";
import { useCategories, useCards } from "@/hooks/use-transactions-data";
import { invalidateRecurring } from "@/lib/query-keys";
import { logApiError } from "@/lib/log-error";
import type { Recurring } from "@/types/recurring";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function RecorrentesPage() {
  const { fetchApi } = useApi();
  const queryClient = useQueryClient();

  const recurringQuery = useRecurring();
  const items = recurringQuery.data ?? [];
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
    try {
      await fetchApi(`/recurring/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !item.active }),
      });
      invalidateRecurring(queryClient);
    } catch {
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

  const monthlyExpense = items
    .filter((i) => i.active && i.type === "EXPENSE")
    .reduce((sum, i) => sum + i.amount, 0);
  const monthlyIncome = items
    .filter((i) => i.active && i.type === "INCOME")
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <>
      <ContentHeader
        title="Recorrentes"
        actions={
          <>
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
