"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Category } from "@/types/transaction";
import type { Goal } from "@/types/goal";

const goalSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  amount: z.number().positive("Valor deve ser positivo"),
  period: z.enum(["MONTHLY", "WEEKLY"]),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
});

interface GoalModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    amount: number;
    period: "MONTHLY" | "WEEKLY";
    categoryId: string;
  }) => Promise<void>;
  goal?: Goal | null;
  categories: Category[];
  usedCategoryIds: string[];
}

export function GoalModal({
  open,
  onClose,
  onSubmit,
  goal,
  categories,
  usedCategoryIds,
}: GoalModalProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<"MONTHLY" | "WEEKLY">("MONTHLY");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = !!goal;

  const availableCategories = isEditing
    ? categories
    : categories.filter((c) => !usedCategoryIds.includes(c.id));

  // Todas as categorias já têm meta: não há o que criar. O select ficaria vazio
  // sem explicação — avisamos e desabilitamos o envio.
  const noCategoriesLeft = !isEditing && availableCategories.length === 0;

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setAmount(String(goal.amount));
      setPeriod(goal.period);
      setCategoryId(goal.categoryId);
    } else {
      setName("");
      setAmount("");
      setPeriod("MONTHLY");
      setCategoryId("");
    }
    setError("");
  }, [goal, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = goalSchema.safeParse({
      name,
      amount: parseFloat(amount),
      period,
      categoryId,
    });

    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await onSubmit(result.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface rounded-[24px] shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
              {isEditing ? "Editar meta" : "Nova meta"}
            </h2>
            <button
              onClick={onClose}
              className="text-fg-muted hover:text-fg cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input
              id="name"
              label="Nome da meta"
              type="text"
              placeholder="Ex: Limite de alimentação"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            {noCategoriesLeft ? (
              <div className="rounded-md border-[1.5px] border-border bg-subtle/50 px-3.5 py-3 text-sm text-fg-muted">
                Todas as categorias já têm meta. Edite uma existente ou crie uma
                nova categoria primeiro.
              </div>
            ) : (
              <Select
                id="category"
                label="Categoria"
                value={categoryId}
                onChange={setCategoryId}
                disabled={isEditing}
                size="md"
                placeholder="Selecione..."
                options={availableCategories.map((c) => ({
                  value: c.id,
                  label: `${c.icon} ${c.name}`,
                }))}
              />
            )}

            <Input
              id="amount"
              label="Limite máximo"
              type="number"
              step="0.01"
              min="0"
              prefix="R$"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <Select
              id="period"
              label="Período"
              value={period}
              onChange={(v) => setPeriod(v as "MONTHLY" | "WEEKLY")}
              size="md"
              options={[
                { value: "MONTHLY", label: "Mensal" },
                { value: "WEEKLY", label: "Semanal" },
              ]}
            />

            {error && (
              <p className="text-sm text-danger text-center">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || noCategoriesLeft}
              >
                {loading
                  ? "Salvando..."
                  : isEditing
                    ? "Salvar"
                    : "Criar meta"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
