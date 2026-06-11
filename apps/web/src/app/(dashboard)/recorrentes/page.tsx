"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Repeat, Pencil, Trash2, CreditCard } from "lucide-react";
import { CategoryIconWithBg } from "@/components/ui/category-icon";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import {
  RecurringModal,
  type RecurringFormData,
} from "@/components/recurring/recurring-modal";
import { DeleteRecurringModal } from "@/components/recurring/delete-recurring-modal";
import { useApi } from "@/hooks/use-api";
import type { Recurring } from "@/types/recurring";
import type { Category } from "@/types/transaction";
import type { Card } from "@/types/card";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function RecorrentesPage() {
  const { fetchApi } = useApi();

  const [items, setItems] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [deleting, setDeleting] = useState<Recurring | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<Recurring[]>("/recurring");
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fetchApi]);

  useEffect(() => {
    fetchItems();
    fetchApi<Category[]>("/categories").then(setCategories).catch(() => {});
    fetchApi<Card[]>("/cards").then(setCards).catch(() => {});
  }, [fetchItems, fetchApi]);

  async function handleCreate(data: RecurringFormData) {
    try {
      await fetchApi("/recurring", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Recorrencia criada com sucesso");
      fetchItems();
    } catch {
      toast.error("Erro ao criar recorrencia");
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
      toast.success("Recorrencia atualizada");
      fetchItems();
    } catch {
      toast.error("Erro ao atualizar recorrencia");
      throw new Error("update failed");
    }
  }

  async function handleToggleActive(item: Recurring) {
    try {
      await fetchApi(`/recurring/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !item.active }),
      });
      fetchItems();
    } catch {
      toast.error("Erro ao atualizar recorrencia");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await fetchApi(`/recurring/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      toast.success("Recorrencia removida");
      fetchItems();
    } catch {
      toast.error("Erro ao remover recorrencia");
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
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            + Nova recorrente
          </Button>
        }
      />

      <div className="p-5 md:p-7 space-y-5">
        {!loading && items.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="text-xs text-fg-muted mb-1">Despesas fixas / mes</p>
              <p className="text-2xl font-bold text-danger font-[family-name:var(--font-mono)]">
                {formatBRL(monthlyExpense)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="text-xs text-fg-muted mb-1">Receitas fixas / mes</p>
              <p className="text-2xl font-bold text-success font-[family-name:var(--font-mono)]">
                {formatBRL(monthlyIncome)}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-lg border border-border bg-surface p-12 text-center">
            <p className="text-fg-muted text-sm">Carregando...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-12 text-center">
            <Repeat size={40} className="mx-auto text-fg-muted mb-3" />
            <p className="text-fg-muted text-sm">
              Nenhuma transacao recorrente.
            </p>
            <p className="text-fg-muted text-xs mt-1">
              Cadastre contas fixas (aluguel, assinaturas, salario) e o LemonFin
              lanca automaticamente todo mes.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-5 py-4 ${
                  idx !== items.length - 1 ? "border-b border-border" : ""
                } ${item.active ? "" : "opacity-50"}`}
              >
                <CategoryIconWithBg
                  slug={item.category?.slug}
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
