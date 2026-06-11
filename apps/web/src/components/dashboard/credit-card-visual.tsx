"use client";

import type { Card } from "@/types/card";

interface CreditCardVisualProps {
  card: Card;
}

function maskedNumber(id: string): string {
  // Derive 4 stable trailing digits from the card id (no real PAN stored).
  const digits = id.replace(/\D/g, "");
  const last4 = (digits.slice(-4) || "0000").padStart(4, "0");
  return `**** **** **** ${last4}`;
}

function expLabel(card: Card): string {
  // We only store closing/due days, so surface the closing day as a "fecha" hint.
  const dd = String(card.closingDay).padStart(2, "0");
  return `Fecha ${dd}`;
}

export function CreditCardVisual({ card }: CreditCardVisualProps) {
  const brand = (card.brand || "VISA").toUpperCase();

  return (
    <div className="relative rounded-[18px] bg-gradient-to-br from-[#6C5CE7] to-[#4534AE] p-5 text-white shadow-grape overflow-hidden">
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -right-2 top-6 h-24 w-24 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between">
        <span className="text-xs font-medium text-white/80">{card.name}</span>
        <span className="font-[family-name:var(--font-display)] text-sm font-bold italic tracking-wide">
          {brand}
        </span>
      </div>

      <div className="relative mt-6 h-7 w-10 rounded-md bg-gradient-to-br from-amber-200 to-amber-400/80" />

      <p className="relative mt-4 font-[family-name:var(--font-mono)] text-[17px] tracking-[0.18em] tabular-nums">
        {maskedNumber(card.id)}
      </p>

      <div className="relative mt-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/60">
            Validade
          </p>
          <p className="font-[family-name:var(--font-mono)] text-sm">
            {expLabel(card)}
          </p>
        </div>
        {card.limit && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-white/60">
              Limite
            </p>
            <p className="font-[family-name:var(--font-mono)] text-sm">
              {Number(card.limit).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 0,
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
