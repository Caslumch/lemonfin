"use client";

import { useState, useEffect, useRef } from "react";
import { X, Check, ChevronDown } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
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
  const [isParcelado, setIsParcelado] = useState(false);
  const [installments, setInstallments] = useState(2);
  const [parcelasOpen, setParcelasOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const parcelasRef = useRef<HTMLDivElement>(null);
  const parcelasTriggerRef = useRef<HTMLButtonElement>(null);

  // Altura máxima da lista (px) — mantém em sincronia com max-h-52 (13rem).
  const PARCELAS_MENU_MAX_H = 208;

  // Abre a lista decidindo a direção: se não couber abaixo do gatilho dentro da
  // viewport, abre para cima. Evita o dropdown ser "comido" pela borda inferior.
  function toggleParcelas() {
    if (parcelasOpen) {
      setParcelasOpen(false);
      return;
    }
    const rect = parcelasTriggerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setDropUp(
        spaceBelow < PARCELAS_MENU_MAX_H + 16 && spaceAbove > spaceBelow,
      );
    }
    setParcelasOpen(true);
  }

  const isEditing = !!transaction;

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(Number(transaction.amount)));
      setDescription(transaction.description || "");
      setDate(transaction.date.slice(0, 10));
      setCategoryId(transaction.categoryId);
      setCardId(transaction.cardId || "");
      setIsParcelado(false);
      setInstallments(2);
    } else {
      setType("EXPENSE");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().slice(0, 10));
      setCategoryId(categories[0]?.id || "");
      setCardId("");
      setIsParcelado(false);
      setInstallments(2);
    }
    setParcelasOpen(false);
    setError("");
  }, [transaction, open, categories]);

  // Fecha o dropdown de parcelas ao clicar fora dele.
  useEffect(() => {
    if (!parcelasOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (parcelasRef.current && !parcelasRef.current.contains(e.target as Node)) {
        setParcelasOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [parcelasOpen]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Parcelamento só vale para despesa na criação, com o switch ligado.
    const isInstallment =
      !isEditing && type === "EXPENSE" && isParcelado && installments >= 2;

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
        <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[24px] bg-surface shadow-xl">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-border">
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
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
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
                {/* Switch "Parcelar" */}
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="parcelar-switch"
                    className="text-sm font-medium text-fg cursor-pointer"
                  >
                    Parcelar
                  </label>
                  <Toggle
                    checked={isParcelado}
                    onCheckedChange={(v) => {
                      setIsParcelado(v);
                      setParcelasOpen(false);
                    }}
                  />
                </div>

                {/* Dropdown de parcelas — só quando o switch está ligado */}
                {isParcelado && (
                  <div className="relative mt-3" ref={parcelasRef}>
                    <button
                      ref={parcelasTriggerRef}
                      type="button"
                      onClick={toggleParcelas}
                      className="flex w-full items-center justify-between rounded-md border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors duration-150 focus:border-fg focus:outline-none"
                    >
                      <span>{installments}x</span>
                      <ChevronDown
                        size={16}
                        className={`text-fg-muted transition-transform duration-150 ${
                          parcelasOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {parcelasOpen && (
                      <ul
                        role="listbox"
                        className={`absolute z-20 max-h-52 w-full overflow-y-auto rounded-md border-[1.5px] border-border bg-surface py-1 shadow-lg ${
                          dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
                        }`}
                      >
                        {Array.from({ length: 47 }, (_, i) => i + 2).map((n) => (
                          <li key={n}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={installments === n}
                              onClick={() => {
                                setInstallments(n);
                                setParcelasOpen(false);
                              }}
                              className={`flex w-full items-center justify-between px-3.5 py-2 text-sm transition-colors hover:bg-muted ${
                                installments === n
                                  ? "font-medium text-fg"
                                  : "text-fg-muted"
                              }`}
                            >
                              <span>{n}x</span>
                              {installments === n && (
                                <Check size={15} className="text-lima" />
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {(() => {
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
                            : `O valor é o total da compra, dividido em ${installments}x.`}{" "}
                          A 1ª parcela cai na <strong>data</strong> informada
                          acima.
                        </p>
                      );
                    })()}
                  </div>
                )}
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
