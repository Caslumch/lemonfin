"use client";

import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/card";
import {
  CreditCardVisual,
  CARD_COLOR_PRESETS,
} from "@/components/dashboard/credit-card-visual";

// Chaves na ordem de exibição (batem com CARD_COLOR_PRESET_KEYS do backend).
const COLOR_KEYS = [
  "grafite",
  "azul",
  "roxo",
  "verde",
  "vinho",
  "teal",
  "ambar",
  "indigo",
] as const;
type ColorKey = (typeof COLOR_KEYS)[number];

const cardSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
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
  colorPreset: z.enum(COLOR_KEYS).nullable().optional(),
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
    colorPreset?: ColorKey | null;
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
  // null = "Bandeira" (sem cor escolhida → o visual segue a bandeira).
  const [colorPreset, setColorPreset] = useState<ColorKey | null>(null);
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
      setColorPreset(
        card.colorPreset && (COLOR_KEYS as readonly string[]).includes(
          card.colorPreset,
        )
          ? (card.colorPreset as ColorKey)
          : null,
      );
    } else {
      setName("");
      setBrand("");
      setLimit("");
      setClosingDay("");
      setDueDay("");
      setColorPreset(null);
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
      colorPreset,
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
        <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[24px] bg-surface shadow-xl">
          <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
              {isEditing ? "Editar cartão" : "Novo cartão"}
            </h2>
            <button
              onClick={onClose}
              className="text-fg-muted hover:text-fg cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            {/* Preview ao vivo: reflete nome, bandeira e cor conforme o usuário
                edita. Usa um Card sintético (id fixo só p/ os 4 dígitos do mock). */}
            <CreditCardVisual
              card={{
                id: card?.id ?? "preview00000000",
                name: name || "Nome do cartão",
                brand: brand || null,
                limit: limit ? String(parseFloat(limit)) : null,
                closingDay: closingDay ? parseInt(closingDay, 10) : 1,
                dueDay: dueDay ? parseInt(dueDay, 10) : null,
                colorPreset,
                userId: card?.userId ?? "",
                createdAt: card?.createdAt ?? "",
                updatedAt: card?.updatedAt ?? "",
                currentSpend: card?.currentSpend,
              }}
            />

            <Input
              id="name"
              label="Nome do cartão"
              type="text"
              placeholder="Ex: Nubank, Inter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Select
              id="brand"
              label="Bandeira"
              value={brand}
              onChange={setBrand}
              size="md"
              placeholder="Selecione..."
              options={BRANDS.map((b) => ({ value: b, label: b }))}
            />

            {/* Cor do cartão: paleta de swatches + "Bandeira" (= sem cor, segue
                a bandeira). A cor escolhida tem prioridade no visual. */}
            <div className="w-full">
              <label className="block text-sm font-medium text-fg mb-1.5">
                Cor do cartão
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {/* "Bandeira" = null: volta ao tema derivado da bandeira. */}
                <button
                  type="button"
                  onClick={() => setColorPreset(null)}
                  aria-label="Cor pela bandeira"
                  aria-pressed={colorPreset === null}
                  className={cn(
                    "h-8 rounded-full border-[1.5px] border-border px-3 text-xs font-medium text-fg-muted transition-transform cursor-pointer hover:scale-105",
                    colorPreset === null &&
                      "ring-2 ring-offset-2 ring-offset-surface ring-fg text-fg",
                  )}
                >
                  Bandeira
                </button>
                {COLOR_KEYS.map((key) => {
                  const preset = CARD_COLOR_PRESETS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setColorPreset(key)}
                      aria-label={key}
                      aria-pressed={colorPreset === key}
                      className={cn(
                        "h-8 w-8 rounded-full bg-gradient-to-br transition-transform cursor-pointer hover:scale-110",
                        preset.gradient,
                        colorPreset === key &&
                          "ring-2 ring-offset-2 ring-offset-surface ring-fg",
                      )}
                    />
                  );
                })}
              </div>
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
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 gap-1.5"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Salvando
                  </>
                ) : isEditing ? (
                  "Salvar"
                ) : (
                  "Adicionar"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
