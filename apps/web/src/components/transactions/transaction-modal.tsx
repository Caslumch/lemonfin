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
  installments: z.number().int().min(1).max(48).optional(),
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
    installments?: number;
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
  const [installments, setInstallments] = useState(1);
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
      setInstallments(1);
    } else {
      setType("EXPENSE");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().slice(0, 10));
      setCategoryId(categories[0]?.id || "");
      setCardId("");
      setInstallments(1);
    }
    setError("");
  }, [transaction, open, categories]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Parcelamento só vale para despesa na criação; 1x = à vista (não envia).
    const isInstallment = !isEditing && type === "EXPENSE" && installments >= 2;

    const result = transactionSchema.safeParse({
      amount: parseFloat(amount),
      type,
      description: description || undefined,
      date: date || undefined,
      categoryId,
      cardId: cardId || undefined,
      installments: isInstallment ? installments : undefined,
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
        <div className="w-full max-w-md bg-surface rounded-[24px] shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
              {isEditing ? "Editar transação" : "Nova transação"}
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
              label="Descrição"
              type="text"
              placeholder="Ex: Almoço no restaurante"
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
                  Cartão (opcional)
                </label>
                <select
                  id="cardId"
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  className="w-full rounded-md border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors duration-150 focus:border-fg focus:outline-none"
                >
                  <option value="">Sem cartão</option>
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Parcelamento — só em despesas e só ao criar (não na edição) */}
            {type === "EXPENSE" && !isEditing && (
              <div className="w-full">
                <label
                  htmlFor="installments"
                  className="block text-sm font-medium text-fg mb-1.5"
                >
                  Parcelas
                </label>
                <select
                  id="installments"
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full rounded-md border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors duration-150 focus:border-fg focus:outline-none"
                >
                  <option value={1}>À vista (1x)</option>
                  {Array.from({ length: 47 }, (_, i) => i + 2).map((n) => (
                    <option key={n} value={n}>
                      {n}x
                    </option>
                  ))}
                </select>
                {installments >= 2 &&
                  (() => {
                    const total = parseFloat(amount);
                    const per =
                      Number.isFinite(total) && total > 0
                        ? total / installments
                        : 0;
                    return (
                      <p className="mt-1.5 text-xs text-fg-muted">
                        {per > 0
                          ? `${installments}x de ${per.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })} (total ${total.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}).`
                          : `Valor é o total da compra, dividido em ${installments}x.`}{" "}
                        A 1ª parcela cai na <strong>data</strong> informada acima.
                      </p>
                    );
                  })()}
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
