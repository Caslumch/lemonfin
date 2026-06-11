"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { CreditCard, Pencil, Trash2 } from "lucide-react";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { CardModal } from "@/components/cards/card-modal";
import { DeleteCardModal } from "@/components/cards/delete-card-modal";
import { InvoiceView } from "@/components/cards/invoice-view";
import { CreditCardVisual } from "@/components/dashboard/credit-card-visual";
import { useApi } from "@/hooks/use-api";
import { logApiError } from "@/lib/log-error";
import type { Card } from "@/types/card";

export default function CartoesPage() {
  const { fetchApi } = useApi();

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deletingCard, setDeletingCard] = useState<Card | null>(null);

  // Invoice view
  const [viewingCard, setViewingCard] = useState<Card | null>(null);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<Card[]>("/cards");
      setCards(data);
    } catch (error) {
      logApiError("load:cards", error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [fetchApi]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  async function handleCreate(data: {
    name: string;
    brand?: string;
    limit?: number;
    closingDay: number;
    dueDay?: number;
  }) {
    try {
      await fetchApi("/cards", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Cartão criado com sucesso");
      fetchCards();
    } catch {
      toast.error("Erro ao criar cartão");
      throw new Error("create failed");
    }
  }

  async function handleUpdate(data: {
    name: string;
    brand?: string;
    limit?: number;
    closingDay: number;
    dueDay?: number;
  }) {
    if (!editingCard) return;
    try {
      await fetchApi(`/cards/${editingCard.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setEditingCard(null);
      toast.success("Cartão atualizado");
      fetchCards();
    } catch {
      toast.error("Erro ao atualizar cartão");
      throw new Error("update failed");
    }
  }

  async function handleDelete() {
    if (!deletingCard) return;
    try {
      await fetchApi(`/cards/${deletingCard.id}`, {
        method: "DELETE",
      });
      setDeletingCard(null);
      toast.success("Cartão removido");
      fetchCards();
    } catch {
      toast.error("Erro ao remover cartão");
    }
  }

  // If viewing invoice, show that instead
  if (viewingCard) {
    return (
      <>
        <ContentHeader title="Cartões" />
        <div className="px-5 pb-8 pt-2 md:px-8">
          <InvoiceView
            cardId={viewingCard.id}
            cardName={viewingCard.name}
            onBack={() => setViewingCard(null)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <ContentHeader
        title="Cartões"
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            + Novo cartão
          </Button>
        }
      />

      <div className="px-5 pb-8 pt-2 md:px-8">
        {loading ? (
          <div className="rounded-[20px] border border-border bg-surface shadow-xs p-12 text-center">
            <p className="text-fg-muted text-sm">Carregando...</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-[20px] border border-border bg-surface shadow-xs p-12 text-center">
            <CreditCard size={40} className="mx-auto text-fg-muted mb-3" />
            <p className="text-fg-muted text-sm">
              Nenhum cartão cadastrado.
            </p>
            <p className="text-fg-muted text-xs mt-1">
              Adicione um cartão para acompanhar faturas e parcelamentos.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div key={card.id} className="flex flex-col gap-2">
                <CreditCardVisual card={card} />
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => setViewingCard(card)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-uva hover:text-uva-hover transition-colors cursor-pointer"
                  >
                    Ver fatura
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingCard(card);
                        setModalOpen(true);
                      }}
                      aria-label="Editar cartão"
                      className="p-1.5 rounded-[10px] text-fg-muted hover:text-fg hover:bg-subtle transition-colors cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingCard(card)}
                      aria-label="Excluir cartão"
                      className="p-1.5 rounded-[10px] text-fg-muted hover:text-danger hover:bg-danger-muted transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      <CardModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCard(null);
        }}
        onSubmit={editingCard ? handleUpdate : handleCreate}
        card={editingCard}
      />

      {/* Delete confirmation */}
      <DeleteCardModal
        open={!!deletingCard}
        onClose={() => setDeletingCard(null)}
        onConfirm={handleDelete}
        cardName={deletingCard?.name}
      />
    </>
  );
}
