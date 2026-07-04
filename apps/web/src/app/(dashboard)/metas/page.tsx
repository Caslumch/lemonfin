"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Target, Pencil, Trash2 } from "lucide-react";
import { CategoryIconWithBg } from "@/components/ui/category-icon";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-button";
import { EmptyState } from "@/components/ui/empty-state";
import { GoalModal } from "@/components/goals/goal-modal";
import { DeleteGoalModal } from "@/components/goals/delete-goal-modal";
import { useApi } from "@/hooks/use-api";
import { useGoals } from "@/hooks/use-resource-queries";
import { useCategories } from "@/hooks/use-transactions-data";
import { invalidateGoals } from "@/lib/query-keys";
import { logApiError } from "@/lib/log-error";
import type { Goal } from "@/types/goal";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function ProgressBar({
  percentage,
  exceeded,
}: {
  percentage: number;
  exceeded: boolean;
}) {
  const width = Math.min(percentage, 100);
  const color = exceeded
    ? "bg-danger"
    : percentage >= 80
      ? "bg-warning"
      : "bg-lima";

  return (
    <div className="w-full h-2 bg-subtle rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function MetasPage() {
  const { fetchApi } = useApi();
  const queryClient = useQueryClient();

  const goalsQuery = useGoals();
  const goals = goalsQuery.data ?? [];
  const loading = goalsQuery.isPending;
  const { data: categories = [] } = useCategories();

  useEffect(() => {
    if (goalsQuery.error) logApiError("load:goals", goalsQuery.error);
  }, [goalsQuery.error]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);

  async function handleCreate(data: {
    name: string;
    amount: number;
    period: "MONTHLY" | "WEEKLY";
    categoryId: string;
  }) {
    try {
      await fetchApi("/goals", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Meta criada com sucesso");
      invalidateGoals(queryClient);
    } catch {
      toast.error("Erro ao criar meta");
      throw new Error("create failed");
    }
  }

  async function handleUpdate(data: {
    name: string;
    amount: number;
    period: "MONTHLY" | "WEEKLY";
    categoryId: string;
  }) {
    if (!editingGoal) return;
    try {
      await fetchApi(`/goals/${editingGoal.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: data.name,
          amount: data.amount,
          period: data.period,
        }),
      });
      setEditingGoal(null);
      toast.success("Meta atualizada");
      invalidateGoals(queryClient);
    } catch {
      toast.error("Erro ao atualizar meta");
      throw new Error("update failed");
    }
  }

  async function handleDelete() {
    if (!deletingGoal) return;
    try {
      await fetchApi(`/goals/${deletingGoal.id}`, { method: "DELETE" });
      setDeletingGoal(null);
      toast.success("Meta removida");
      invalidateGoals(queryClient);
    } catch {
      toast.error("Erro ao remover meta");
    }
  }

  const usedCategoryIds = goals.map((g) => g.categoryId);

  return (
    <>
      <ContentHeader
        title="Metas"
        actions={
          <>
            <RefreshButton
              onRefresh={() => invalidateGoals(queryClient)}
              refreshing={goalsQuery.isFetching}
            />
            <Button size="sm" onClick={() => setModalOpen(true)}>
              + Nova meta
            </Button>
          </>
        }
      />

      <div className="px-5 pb-8 pt-2 md:px-8">
        {loading ? (
          <div className="rounded-[20px] border border-border bg-surface shadow-xs p-12 text-center">
            <p className="text-fg-muted text-sm">Carregando...</p>
          </div>
        ) : goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Nenhuma meta definida"
            description="Defina um teto de gasto por categoria e acompanhe quanto já usou no mês."
            actionLabel="Criar primeira meta"
            onAction={() => setModalOpen(true)}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-[20px] border border-border bg-surface shadow-xs p-5 transition-colors hover:border-fg/20"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CategoryIconWithBg
                      slug={goal.category?.slug}
                      icon={goal.category?.icon}
                      colorBg={goal.category?.colorBg}
                      colorText={goal.category?.colorText}
                    />
                    <div>
                      <h3 className="font-semibold text-fg text-sm">
                        {goal.name}
                      </h3>
                      <p className="text-xs text-fg-muted">
                        {goal.category?.name} —{" "}
                        {goal.period === "MONTHLY" ? "Mensal" : "Semanal"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingGoal(goal);
                        setModalOpen(true);
                      }}
                      className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-subtle transition-colors cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingGoal(goal)}
                      className="p-1.5 rounded text-fg-muted hover:text-danger hover:bg-danger-muted transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <ProgressBar
                    percentage={goal.progress.percentage}
                    exceeded={goal.progress.exceeded}
                  />
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg font-bold text-fg font-[family-name:var(--font-mono)]">
                      {formatBRL(goal.progress.spent)}
                    </p>
                    <p className="text-xs text-fg-muted">
                      de {formatBRL(goal.progress.limit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        goal.progress.exceeded
                          ? "text-danger"
                          : goal.progress.percentage >= 80
                            ? "text-warning"
                            : "text-success"
                      }`}
                    >
                      {goal.progress.percentage}%
                    </p>
                    <p className="text-xs text-fg-muted">
                      {goal.progress.exceeded
                        ? `${formatBRL(goal.progress.spent - goal.progress.limit)} acima`
                        : `${formatBRL(goal.progress.remaining)} restante`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <GoalModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingGoal(null);
        }}
        onSubmit={editingGoal ? handleUpdate : handleCreate}
        goal={editingGoal}
        categories={categories}
        usedCategoryIds={usedCategoryIds}
      />

      <DeleteGoalModal
        open={!!deletingGoal}
        onClose={() => setDeletingGoal(null)}
        onConfirm={handleDelete}
        goalName={deletingGoal?.name}
      />
    </>
  );
}
