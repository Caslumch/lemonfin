"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { CreditCard, Pencil, Trash2 } from "lucide-react";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { CardModal } from "@/components/cards/card-modal";
import { DeleteCardModal } from "@/components/cards/delete-card-modal";
import { InvoiceView } from "@/components/cards/invoice-view";
import { useApi } from "@/hooks/use-api";
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
    } catch {
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
      toast.success("Cartao criado com sucesso");
      fetchCards();
    } catch {
      toast.error("Erro ao criar cartao");
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
      toast.success("Cartao atualizado");
      fetchCards();
    } catch {
      toast.error("Erro ao atualizar cartao");
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
      toast.success("Cartao removido");
      fetchCards();
    } catch {
      toast.error("Erro ao remover cartao");
    }
  }

  // If viewing invoice, show that instead
  if (viewingCard) {
    return (
      <>
        <ContentHeader title="Cartoes" />
        <div className="p-5 md:p-7">
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
        title="Cartoes"
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            + Novo cartao
          </Button>
        }
      />

      <div className="p-5 md:p-7">
        {loading ? (
          <div className="rounded-lg border border-border bg-surface p-12 text-center">
            <p className="text-fg-muted text-sm">Carregando...</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-12 text-center">
            <CreditCard size={40} className="mx-auto text-fg-muted mb-3" />
            <p className="text-fg-muted text-sm">
              Nenhum cartao cadastrado.
            </p>
            <p className="text-fg-muted text-xs mt-1">
              Adicione um cartao para acompanhar faturas e parcelamentos.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className="rounded-lg border border-border bg-surface p-5 hover:border-fg/20 transition-colors cursor-pointer"
                onClick={() => setViewingCard(card)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard size={20} className="text-fg-secondary" />
                    <h3 className="font-semibold text-fg">{card.name}</h3>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setEditingCard(card);
                        setModalOpen(true);
                      }}
                      className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-subtle transition-colors cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingCard(card)}
                      className="p-1.5 rounded text-fg-muted hover:text-danger hover:bg-danger-muted transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {card.brand && (
                  <p className="text-xs text-fg-muted mb-2">{card.brand}</p>
                )}

                <div className="flex gap-4 text-xs text-fg-secondary">
                  {card.limit && (
                    <span>
                      Limite:{" "}
                      {Number(card.limit).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  )}
                  <span>Fecha dia {card.closingDay}</span>
                  {card.dueDay && <span>Vence dia {card.dueDay}</span>}
                </div>

                <p className="text-xs text-fg-muted mt-3">
                  Clique para ver a fatura
                </p>
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
