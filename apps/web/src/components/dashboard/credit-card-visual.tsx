"use client";

import type { Card } from "@/types/card";

interface CreditCardVisualProps {
  card: Card;
}

// Tema por bandeira: base neutra/escura + um acento sóbrio próprio de cada
// bandeira. Sem cores vibrantes — tons grafite/neutros.
interface BrandTheme {
  gradient: string; // classes de gradiente do fundo (neutro)
  accent: string; // cor do nome da bandeira / detalhe
  chip: string; // gradiente do "chip" do cartão
}

const BRAND_THEMES: Record<string, BrandTheme> = {
  visa: {
    gradient: "from-[#1A2A3A] to-[#0C1622]",
    accent: "text-[#8FB3D9]",
    chip: "from-[#C9D6E3] to-[#9FB2C6]",
  },
  mastercard: {
    gradient: "from-[#2A2622] to-[#161310]",
    accent: "text-[#D9A88F]",
    chip: "from-[#E3D2C9] to-[#C6AC9F]",
  },
  elo: {
    gradient: "from-[#1C1C1E] to-[#0A0A0B]",
    accent: "text-[#C9C9CE]",
    chip: "from-[#D4D4D8] to-[#A1A1AA]",
  },
  amex: {
    gradient: "from-[#1A2A2A] to-[#0C1818]",
    accent: "text-[#8FD9C9]",
    chip: "from-[#C9E3DD] to-[#9FC6BC]",
  },
  hipercard: {
    gradient: "from-[#2A1C1E] to-[#160C0E]",
    accent: "text-[#D98F95]",
    chip: "from-[#E3C9CC] to-[#C69FA3]",
  },
  // Neutro puro (Outro / sem bandeira)
  default: {
    gradient: "from-[#26262A] to-[#121214]",
    accent: "text-white/70",
    chip: "from-[#D4D4D8] to-[#A1A1AA]",
  },
};

function themeFor(brand?: string | null): BrandTheme {
  if (!brand) return BRAND_THEMES.default;
  const key = brand.trim().toLowerCase();
  return BRAND_THEMES[key] ?? BRAND_THEMES.default;
}

function maskedNumber(id: string): string {
  // 4 dígitos finais estáveis a partir do id (não guardamos PAN real).
  const digits = id.replace(/\D/g, "");
  const last4 = (digits.slice(-4) || "0000").padStart(4, "0");
  return `**** **** **** ${last4}`;
}

export function CreditCardVisual({ card }: CreditCardVisualProps) {
  const brand = (card.brand || "").trim();
  const brandLabel = brand ? brand.toUpperCase() : "CARTÃO";
  const theme = themeFor(brand);

  return (
    <div
      className={`relative overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-br ${theme.gradient} p-5 text-white shadow-md ring-1 ring-white/[0.04]`}
    >
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/5" />
      <div className="absolute -right-2 top-6 h-24 w-24 rounded-full bg-white/[0.03]" />

      <div className="relative flex items-start justify-between">
        <span className="text-xs font-medium text-white/80">{card.name}</span>
        <span
          className={`font-[family-name:var(--font-display)] text-sm font-bold italic tracking-wide ${theme.accent}`}
        >
          {brandLabel}
        </span>
      </div>

      <div
        className={`relative mt-6 h-7 w-10 rounded-md bg-gradient-to-br ${theme.chip}`}
      />

      <p className="relative mt-4 font-[family-name:var(--font-mono)] text-[17px] tracking-[0.18em] tabular-nums text-white/90">
        {maskedNumber(card.id)}
      </p>

      <div className="relative mt-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/50">
            Fechamento
          </p>
          <p className="font-[family-name:var(--font-mono)] text-sm">
            dia {card.closingDay}
          </p>
        </div>
        {card.limit && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-white/50">
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
