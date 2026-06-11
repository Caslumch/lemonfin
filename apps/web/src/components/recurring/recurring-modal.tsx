"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category } from "@/types/transaction";
import type { Card } from "@/types/card";
import type { Recurring } from "@/types/recurring";

const recurringSchema = z.object({
  description: z.string().min(1, "Descricao e obrigatoria"),
  amount: z.number().positive("Valor deve ser positivo"),
  type: z.enum(["INCOME", "EXPENSE"]),
  dayOfMonth: z.number().int().min(1, "Dia invalido").max(31, "Dia invalido"),
  categoryId: z.string().min(1, "Categoria e obrigatoria"),
  cardId: z.string().optional(),
});

export interface RecurringFormData {
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  dayOfMonth: number;
  categoryId: string;
  cardId?: string;
}

interface RecurringModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RecurringFormData) => Promise<void>;
  recurring?: Recurring | null;
  categories: Category[];
  cards: Card[];
}

export function RecurringModal({
  open,
  onClose,
  onSubmit,
  recurring,
  categories,
  cards,
}: RecurringModalProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [cardId, setCardId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = !!recurring;

  useEffect(() => {
    if (recurring) {
      setDescription(recurring.description);
      setAmount(String(recurring.amount));
      setType(recurring.type);
      setDayOfMonth(String(recurring.dayOfMonth));
      setCategoryId(recurring.categoryId);
      setCardId(recurring.cardId ?? "");
    } else {
      setDescription("");
      setAmount("");
      setType("EXPENSE");
      setDayOfMonth("1");
      setCategoryId("");
      setCardId("");
    }
    setError("");
  }, [recurring, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = recurringSchema.safeParse({
      description,
      amount: parseFloat(amount),
      type,
      dayOfMonth: parseInt(dayOfMonth, 10),
      categoryId,
      cardId: cardId || undefined,
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
              {isEditing ? "Editar recorrencia" : "Nova recorrencia"}
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
              id="description"
              label="Descricao"
              type="text"
              placeholder="Ex: Aluguel, Netflix, Salario"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            <div className="w-full">
              <label className="block text-sm font-medium text-fg mb-1.5">
                Tipo
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("EXPENSE")}
                  className={`rounded-md border-[1.5px] px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    type === "EXPENSE"
                      ? "border-danger bg-danger-muted text-danger"
                      : "border-border text-fg-muted hover:text-fg"
                  }`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setType("INCOME")}
                  className={`rounded-md border-[1.5px] px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    type === "INCOME"
                      ? "border-success bg-success-muted text-success"
                      : "border-border text-fg-muted hover:text-fg"
                  }`}
                >
                  Receita
                </button>
              </div>
            </div>

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
                className="w-full rounded-md border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors duration-150 focus:border-fg focus:outline-none"
              >
                <option value="">Selecione...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="amount"
              label="Valor"
              type="number"
              step="0.01"
              min="0"
              prefix="R$"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <Input
              id="dayOfMonth"
              label="Dia do mes"
              type="number"
              min="1"
              max="31"
              placeholder="1"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              required
            />

            <div className="w-full">
              <label
                htmlFor="card"
                className="block text-sm font-medium text-fg mb-1.5"
              >
                Cartao{" "}
                <span className="text-fg-muted font-normal">(opcional)</span>
              </label>
              <select
                id="card"
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="w-full rounded-md border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors duration-150 focus:border-fg focus:outline-none"
              >
                <option value="">Nenhum</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
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
                    : "Criar recorrencia"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
