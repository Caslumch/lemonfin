"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Target, Pencil, Trash2 } from "lucide-react";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { GoalModal } from "@/components/goals/goal-modal";
import { DeleteGoalModal } from "@/components/goals/delete-goal-modal";
import { useApi } from "@/hooks/use-api";
import type { Goal } from "@/types/goal";
import type { Category } from "@/types/transaction";

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

  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<Goal[]>("/goals");
      setGoals(data);
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [fetchApi]);

  useEffect(() => {
    fetchGoals();
    fetchApi<Category[]>("/categories").then(setCategories).catch(() => {});
  }, [fetchGoals, fetchApi]);

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
      fetchGoals();
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
      fetchGoals();
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
      fetchGoals();
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
          <Button size="sm" onClick={() => setModalOpen(true)}>
            + Nova meta
          </Button>
        }
      />

      <div className="p-5 md:p-7">
        {loading ? (
          <div className="rounded-lg border border-border bg-surface p-12 text-center">
            <p className="text-fg-muted text-sm">Carregando...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-12 text-center">
            <Target size={40} className="mx-auto text-fg-muted mb-3" />
            <p className="text-fg-muted text-sm">Nenhuma meta definida.</p>
            <p className="text-fg-muted text-xs mt-1">
              Crie metas para controlar seus gastos por categoria.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-fg/20"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {goal.category?.icon ?? "🎯"}
                    </span>
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
