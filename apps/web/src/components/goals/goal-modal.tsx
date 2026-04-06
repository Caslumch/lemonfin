"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category } from "@/types/transaction";
import type { Goal } from "@/types/goal";

const goalSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  amount: z.number().positive("Valor deve ser positivo"),
  period: z.enum(["MONTHLY", "WEEKLY"]),
  categoryId: z.string().min(1, "Categoria e obrigatoria"),
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
        <div className="w-full max-w-md bg-surface rounded-lg shadow-xl">
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
              placeholder="Ex: Limite de alimentacao"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="w-full">
              <label
                htmlFor="category"
                className="block text-sm font-medium text-fg mb-1.5"
              >
                Categoria
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={isEditing}
                className="w-full rounded-md border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors duration-150 focus:border-fg focus:outline-none disabled:opacity-50"
              >
                <option value="">Selecione...</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="amount"
              label="Limite maximo"
              type="number"
              step="0.01"
              min="0"
              prefix="R$"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <div className="w-full">
              <label
                htmlFor="period"
                className="block text-sm font-medium text-fg mb-1.5"
              >
                Periodo
              </label>
              <select
                id="period"
                value={period}
                onChange={(e) =>
                  setPeriod(e.target.value as "MONTHLY" | "WEEKLY")
                }
                className="w-full rounded-md border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors duration-150 focus:border-fg focus:outline-none"
              >
                <option value="MONTHLY">Mensal</option>
                <option value="WEEKLY">Semanal</option>
              </select>
            </div>

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
              <Button type="submit" className="flex-1" disabled={loading}>
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
