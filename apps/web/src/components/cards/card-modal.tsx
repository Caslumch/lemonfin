"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Card } from "@/types/card";

const cardSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  brand: z.string().optional(),
  limit: z.number().positive("Limite deve ser positivo").optional(),
  closingDay: z
    .number()
    .int()
    .min(1, "Dia deve ser entre 1 e 31")
    .max(31, "Dia deve ser entre 1 e 31"),
  dueDay: z
    .number()
    .int()
    .min(1, "Dia deve ser entre 1 e 31")
    .max(31, "Dia deve ser entre 1 e 31")
    .optional(),
});

const BRANDS = ["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Outro"];

interface CardModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    brand?: string;
    limit?: number;
    closingDay: number;
    dueDay?: number;
  }) => Promise<void>;
  card?: Card | null;
}

export function CardModal({
  open,
  onClose,
  onSubmit,
  card,
}: CardModalProps) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = !!card;

  useEffect(() => {
    if (card) {
      setName(card.name);
      setBrand(card.brand || "");
      setLimit(card.limit ? String(Number(card.limit)) : "");
      setClosingDay(String(card.closingDay));
      setDueDay(card.dueDay ? String(card.dueDay) : "");
    } else {
      setName("");
      setBrand("");
      setLimit("");
      setClosingDay("");
      setDueDay("");
    }
    setError("");
  }, [card, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = cardSchema.safeParse({
      name,
      brand: brand || undefined,
      limit: limit ? parseFloat(limit) : undefined,
      closingDay: parseInt(closingDay, 10),
      dueDay: dueDay ? parseInt(dueDay, 10) : undefined,
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
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface rounded-lg shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
              {isEditing ? "Editar cartao" : "Novo cartao"}
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
              label="Nome do cartao"
              type="text"
              placeholder="Ex: Nubank, Inter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="w-full">
              <label
                htmlFor="brand"
                className="block text-sm font-medium text-fg mb-1.5"
              >
                Bandeira
              </label>
              <select
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-md border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors duration-150 focus:border-fg focus:outline-none"
              >
                <option value="">Selecione...</option>
                {BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="limit"
              label="Limite"
              type="number"
              step="0.01"
              min="0"
              prefix="R$"
              placeholder="0,00"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                id="closingDay"
                label="Dia de fechamento"
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 15"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
                required
              />

              <Input
                id="dueDay"
                label="Dia de vencimento"
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 25"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
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
                    : "Adicionar"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
