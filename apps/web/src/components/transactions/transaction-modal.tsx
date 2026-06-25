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
    // true quando a edição deve recriar a compra parcelada inteira (scope=group).
    editGroup?: boolean;
  }) => Promise<void>;
  transaction?: Transaction | null;
  categories: Category[];
  cards?: Card[];
}

// Recua `months` meses a partir de uma data ISO (ancorada ao meio-dia UTC),
// devolvendo "YYYY-MM-DD". Usado para descobrir a data da 1ª parcela a partir
// de uma parcela do meio do grupo (a data desta - (n-1) meses), fazendo clamp
// do dia ao último dia válido do mês-alvo (igual ao backend).
function isoMinusMonthsToInput(iso: string, months: number): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m - months + 1, 0)).getUTCDate();
  const target = new Date(
    Date.UTC(y, m - months, Math.min(day, lastDay), 12, 0, 0),
  );
  return target.toISOString().slice(0, 10);
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
  // true quando estamos editando uma compra parcelada já existente (o modal
  // abre em modo grupo: valor TOTAL, nº de parcelas e data da 1ª, e salvar
  // recria todas as parcelas).
  const [isEditingGroup, setIsEditingGroup] = useState(false);
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
      // Compra parcelada (a transação é a parcela n/N): abre em modo grupo.
      const total = transaction.installmentTotal ?? 0;
      const number = transaction.installmentNumber ?? 0;
      const isGroup = total >= 2 && number >= 1;

      setType(transaction.type);
      setIsEditingGroup(isGroup);

      if (isGroup) {
        // Valor exibido = TOTAL da compra (soma das N parcelas), derivado do
        // valor desta parcela × N. Descrição sem o sufixo "(n/N)" que o backend
        // acrescenta. Data = a da 1ª parcela (recuando n-1 meses desta).
        const perInstallment = Number(transaction.amount);
        setAmount(String(Math.round(perInstallment * total * 100) / 100));
        setDescription(
          (transaction.description || "").replace(/\s*\(\d+\/\d+\)\s*$/, ""),
        );
        setDate(isoMinusMonthsToInput(transaction.date, number - 1));
        setInstallments(total);
      } else {
        setAmount(String(Number(transaction.amount)));
        setDescription(transaction.description || "");
        setDate(transaction.date.slice(0, 10));
        setInstallments(2);
      }

      setCategoryId(transaction.categoryId);
      setCardId(transaction.cardId || "");
      setIsParcelado(false);
    } else {
      setType("EXPENSE");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().slice(0, 10));
      setCategoryId(categories[0]?.id || "");
      setCardId("");
      setIsParcelado(false);
      setInstallments(2);
      setIsEditingGroup(false);
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

    // Parcelamento na CRIAÇÃO: despesa com o switch ligado. Na EDIÇÃO de um
    // grupo, o nº de parcelas vem do mesmo seletor (sempre >= 2).
    const isInstallment = isEditingGroup
      ? installments >= 2
      : !isEditing && type === "EXPENSE" && isParcelado && installments >= 2;

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
        editGroup: isEditingGroup,
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

            {/* Parcelamento — ao CRIAR uma despesa (com switch) ou ao EDITAR
                uma compra parcelada existente (modo grupo, seletor sempre visível). */}
            {((type === "EXPENSE" && !isEditing) || isEditingGroup) && (
              <div className="w-full">
                {/* Switch "Parcelar" — só na criação. No modo grupo a compra já
                    é parcelada, então não faz sentido ligar/desligar. */}
                {!isEditingGroup && (
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
                )}

                {isEditingGroup && (
                  <label className="block text-sm font-medium text-fg mb-1.5">
                    Parcelas
                  </label>
                )}

                {/* Dropdown de parcelas — quando o switch está ligado (criação)
                    ou sempre, no modo grupo (edição). */}
                {(isParcelado || isEditingGroup) && (
                  <div
                    className={`relative ${isEditingGroup ? "" : "mt-3"}`}
                    ref={parcelasRef}
                  >
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
                          {isEditingGroup && (
                            <>
                              {" "}
                              Salvar <strong>recria todas as parcelas</strong>{" "}
                              desta compra.
                            </>
                          )}
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
