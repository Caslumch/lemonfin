"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Pencil, Trash2 } from "lucide-react";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-button";
import { ErrorState } from "@/components/ui/error-state";
import { CardModal } from "@/components/cards/card-modal";
import { DeleteCardModal } from "@/components/cards/delete-card-modal";
import { InvoiceView } from "@/components/cards/invoice-view";
import { CreditCardVisual } from "@/components/dashboard/credit-card-visual";
import { useApi } from "@/hooks/use-api";
import { useCards } from "@/hooks/use-transactions-data";
import { invalidateCards } from "@/lib/query-keys";
import { logApiError } from "@/lib/log-error";
import type { Card } from "@/types/card";

/**
 * Skeleton no formato do grid de cartões.
 *
 * O ListSkeleton genérico é uma pilha de linhas horizontais baixas; o conteúdo
 * real é um grid de cartões altos. Usar aquele aqui trocava um pulo de layout
 * por outro, então este espelha a proporção do CreditCardVisual e a linha de
 * ações abaixo dele.
 */
function CardsGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="animate-pulse rounded-[18px] border border-border bg-muted h-[188px]" />
          <div className="flex animate-pulse items-center justify-between px-1">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="flex gap-1">
              <div className="h-7 w-7 rounded-full bg-muted" />
              <div className="h-7 w-7 rounded-full bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CartoesPage() {
  const { fetchApi } = useApi();
  const queryClient = useQueryClient();

  const cardsQuery = useCards();
  const cards = cardsQuery.data ?? [];
  const loading = cardsQuery.isPending;

  useEffect(() => {
    if (cardsQuery.error) logApiError("load:cards", cardsQuery.error);
  }, [cardsQuery.error]);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deletingCard, setDeletingCard] = useState<Card | null>(null);

  // Invoice view
  const [viewingCard, setViewingCard] = useState<Card | null>(null);

  async function handleCreate(data: {
    name: string;
    brand?: string;
    limit?: number;
    closingDay: number;
    dueDay?: number;
    colorPreset?: string | null;
  }) {
    try {
      await fetchApi("/cards", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Cartão criado com sucesso");
      invalidateCards(queryClient);
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
    colorPreset?: string | null;
  }) {
    if (!editingCard) return;
    try {
      await fetchApi(`/cards/${editingCard.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setEditingCard(null);
      toast.success("Cartão atualizado");
      invalidateCards(queryClient);
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
      invalidateCards(queryClient);
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
          <>
            <RefreshButton
              onRefresh={() => invalidateCards(queryClient)}
              refreshing={cardsQuery.isFetching}
            />
            <Button size="sm" onClick={() => setModalOpen(true)}>
              + Novo cartão
            </Button>
          </>
        }
      />

      <div className="px-5 pb-8 pt-2 md:px-8">
        {loading ? (
          <CardsGridSkeleton />
        ) : cardsQuery.error ? (
          /* Sem isto a falha caía no empty state e o usuário lia "Nenhum cartão
             cadastrado" — erro indistinguível de conta vazia. */
          <ErrorState
            onRetry={() => cardsQuery.refetch()}
            retrying={cardsQuery.isFetching}
            description="Não foi possível carregar seus cartões. Verifique sua conexão e tente de novo."
          />
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
