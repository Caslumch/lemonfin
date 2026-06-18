"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PiggyBank, Pencil, Trash2, Check } from "lucide-react";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-button";
import { ReserveModal } from "@/components/reserves/reserve-modal";
import { DeleteReserveModal } from "@/components/reserves/delete-reserve-modal";
import { useApi } from "@/hooks/use-api";
import { useReserves } from "@/hooks/use-resource-queries";
import { invalidateReserves } from "@/lib/query-keys";
import { logApiError } from "@/lib/log-error";
import type { Reserve } from "@/types/reserve";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDeadline(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function ProgressBar({ percentage }: { percentage: number }) {
  const width = Math.min(percentage, 100);
  const color = percentage >= 100 ? "bg-success" : "bg-lima";

  return (
    <div className="w-full h-2 bg-subtle rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function ReserveCard({
  reserve,
  onEdit,
  onDelete,
}: {
  reserve: Reserve;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const done = !reserve.active || reserve.progress.percentage >= 100;

  return (
    <div className="rounded-[20px] border border-border bg-surface shadow-xs p-5 transition-colors hover:border-fg/20">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lima/15 text-lima">
            <PiggyBank size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-fg text-sm">{reserve.name}</h3>
            <p className="text-xs text-fg-muted">
              {done ? "Concluída" : `Prazo: ${formatDeadline(reserve.deadline)}`}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-subtle transition-colors cursor-pointer"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded text-fg-muted hover:text-danger hover:bg-danger-muted transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <ProgressBar percentage={reserve.progress.percentage} />
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-bold text-fg font-[family-name:var(--font-mono)]">
            {formatBRL(reserve.savedAmount)}
          </p>
          <p className="text-xs text-fg-muted">
            de {formatBRL(reserve.targetAmount)}
          </p>
        </div>
        <div className="text-right">
          {done ? (
            <p className="inline-flex items-center gap-1 text-sm font-semibold text-success">
              <Check size={14} /> Completa
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-fg">
                {reserve.progress.percentage}%
              </p>
              <p className="text-xs text-fg-muted">
                faltam {formatBRL(reserve.progress.remaining)}
              </p>
            </>
          )}
        </div>
      </div>

      {!done && reserve.progress.suggestedMonthly > 0 && (
        <p className="mt-3 text-xs text-fg-muted border-t border-border pt-3">
          Sugestão: guarde{" "}
          <span className="font-medium text-fg">
            {formatBRL(reserve.progress.suggestedMonthly)}/mês
          </span>{" "}
          ({reserve.progress.monthsRemaining}{" "}
          {reserve.progress.monthsRemaining === 1 ? "mês" : "meses"})
        </p>
      )}
    </div>
  );
}

export default function ReservasPage() {
  const { fetchApi } = useApi();
  const queryClient = useQueryClient();

  const reservesQuery = useReserves();
  const reserves = reservesQuery.data ?? [];
  const loading = reservesQuery.isPending;

  useEffect(() => {
    if (reservesQuery.error) logApiError("load:reserves", reservesQuery.error);
  }, [reservesQuery.error]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reserve | null>(null);
  const [deleting, setDeleting] = useState<Reserve | null>(null);

  async function handleCreate(data: {
    name: string;
    targetAmount: number;
    deadline: string;
  }) {
    try {
      await fetchApi("/reserves", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Reserva criada com sucesso");
      invalidateReserves(queryClient);
    } catch {
      toast.error("Erro ao criar reserva");
      throw new Error("create failed");
    }
  }

  async function handleUpdate(data: {
    name: string;
    targetAmount: number;
    deadline: string;
  }) {
    if (!editing) return;
    try {
      await fetchApi(`/reserves/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setEditing(null);
      toast.success("Reserva atualizada");
      invalidateReserves(queryClient);
    } catch {
      toast.error("Erro ao atualizar reserva");
      throw new Error("update failed");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await fetchApi(`/reserves/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      toast.success("Reserva removida");
      invalidateReserves(queryClient);
    } catch {
      toast.error("Erro ao remover reserva");
    }
  }

  const active = reserves.filter((r) => r.active);
  const completed = reserves.filter((r) => !r.active);

  return (
    <>
      <ContentHeader
        title="Reservas"
        actions={
          <>
            <RefreshButton
              onRefresh={() => invalidateReserves(queryClient)}
              refreshing={reservesQuery.isFetching}
            />
            <Button size="sm" onClick={() => setModalOpen(true)}>
              + Nova reserva
            </Button>
          </>
        }
      />

      <div className="px-5 pb-8 pt-2 md:px-8">
        {loading ? (
          <div className="rounded-[20px] border border-border bg-surface shadow-xs p-12 text-center">
            <p className="text-fg-muted text-sm">Carregando...</p>
          </div>
        ) : reserves.length === 0 ? (
          <div className="rounded-[20px] border border-border bg-surface shadow-xs p-12 text-center">
            <PiggyBank size={40} className="mx-auto text-fg-muted mb-3" />
            <p className="text-fg-muted text-sm">Nenhuma reserva ainda.</p>
            <p className="text-fg-muted text-xs mt-1">
              Crie uma reserva para juntar dinheiro com um objetivo e prazo.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {active.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((reserve) => (
                  <ReserveCard
                    key={reserve.id}
                    reserve={reserve}
                    onEdit={() => {
                      setEditing(reserve);
                      setModalOpen(true);
                    }}
                    onDelete={() => setDeleting(reserve)}
                  />
                ))}
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-fg-muted mb-3">
                  Concluídas
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {completed.map((reserve) => (
                    <ReserveCard
                      key={reserve.id}
                      reserve={reserve}
                      onEdit={() => {
                        setEditing(reserve);
                        setModalOpen(true);
                      }}
                      onDelete={() => setDeleting(reserve)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ReserveModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={editing ? handleUpdate : handleCreate}
        reserve={editing}
      />

      <DeleteReserveModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        reserveName={deleting?.name}
      />
    </>
  );
}
