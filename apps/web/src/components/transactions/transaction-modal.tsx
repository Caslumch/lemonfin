"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import type { Transaction, Category } from "@/types/transaction";
import type { Card } from "@/types/card";

const transactionSchema = z.object({
  amount: z.number().positive("Informe um valor maior que zero"),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().optional(),
  date: z.string().optional(),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  cardId: z.string().optional(),
});

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    amount: number;
    type: "INCOME" | "EXPENSE";
    description?: string;
    date?: string;
    categoryId: string;
    cardId?: string;
  }) => Promise<void>;
  transaction?: Transaction | null;
  categories: Category[];
  cards?: Card[];
}

export function TransactionModal({
  open,
  onClose,
  onSubmit,
  transaction,
  categories,
  cards = [],
}: TransactionModalProps) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cardId, setCardId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = !!transaction;

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(Number(transaction.amount)));
      setDescription(transaction.description || "");
      setDate(transaction.date.slice(0, 10));
      setCategoryId(transaction.categoryId);
      setCardId(transaction.cardId || "");
    } else {
      setType("EXPENSE");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().slice(0, 10));
      setCategoryId(categories[0]?.id || "");
      setCardId("");
    }
    setError("");
  }, [transaction, open, categories]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = transactionSchema.safeParse({
      amount: parseFloat(amount),
      type,
      description: description || undefined,
      date: date || undefined,
      categoryId,
      cardId: cardId || undefined,
    });

    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...result.data,
        date: result.data.date
          ? new Date(result.data.date + "T12:00:00").toISOString()
          : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
              {isEditing ? "Editar transacao" : "Nova transacao"}
            </h2>
            <button
              onClick={onClose}
              className="text-fg-muted hover:text-fg cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Type tabs */}
            <Tabs
              value={type}
              onValueChange={(v) => setType(v as "INCOME" | "EXPENSE")}
              items={[
                { value: "EXPENSE", label: "Despesa" },
                { value: "INCOME", label: "Receita" },
              ]}
              className="w-full"
            />

            {/* Amount */}
            <Input
              id="amount"
              label="Valor"
              type="number"
              step="0.01"
              min="0.01"
              prefix="R$"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            {/* Description */}
            <Input
              id="description"
              label="Descricao"
              type="text"
              placeholder="Ex: Almoco no restaurante"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Date */}
            <Input
              id="date"
              label="Data"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            {/* Category */}
            <div className="w-full">
              <label
                htmlFor="categoryId"
                className="block text-sm font-medium text-fg mb-1.5"
              >
                Categoria
              </label>
              <select
                id="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors duration-150 focus:border-fg focus:outline-none"
                required
              >
                <option value="">Selecione...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Card (only for expenses) */}
            {type === "EXPENSE" && cards.length > 0 && (
              <div className="w-full">
                <label
                  htmlFor="cardId"
                  className="block text-sm font-medium text-fg mb-1.5"
                >
                  Cartao (opcional)
                </label>
                <select
                  id="cardId"
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  className="w-full rounded-md border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors duration-150 focus:border-fg focus:outline-none"
                >
                  <option value="">Sem cartao</option>
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <p className="text-sm text-danger text-center">{error}</p>
            )}

            {/* Actions */}
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
                    : "Adicionar"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
