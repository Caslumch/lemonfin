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

// Cores escolhíveis pelo usuário (chaves batem com CARD_COLOR_PRESET_KEYS do
// backend). Mesma linguagem sóbria/escura dos temas por bandeira — gradientes
// grafite com um acento próprio — para não destoar do visual do cartão. Quando
// o cartão tem colorPreset, ESTE tema vence o da bandeira.
export const CARD_COLOR_PRESETS: Record<string, BrandTheme> = {
  grafite: {
    gradient: "from-[#26262A] to-[#121214]",
    accent: "text-white/70",
    chip: "from-[#D4D4D8] to-[#A1A1AA]",
  },
  azul: {
    gradient: "from-[#1A2A3A] to-[#0C1622]",
    accent: "text-[#8FB3D9]",
    chip: "from-[#C9D6E3] to-[#9FB2C6]",
  },
  roxo: {
    gradient: "from-[#2A2140] to-[#140F22]",
    accent: "text-[#B9A8E3]",
    chip: "from-[#D6CCE9] to-[#B2A3C6]",
  },
  verde: {
    gradient: "from-[#1C2E22] to-[#0C160F]",
    accent: "text-[#9FD9AF]",
    chip: "from-[#C9E3D2] to-[#9FC6AC]",
  },
  vinho: {
    gradient: "from-[#3A1C24] to-[#1A0C12]",
    accent: "text-[#D98FA3]",
    chip: "from-[#E3C9D2] to-[#C69FAC]",
  },
  teal: {
    gradient: "from-[#16302E] to-[#0A1614]",
    accent: "text-[#8FD9CE]",
    chip: "from-[#C9E3DE] to-[#9FC6BF]",
  },
  ambar: {
    gradient: "from-[#332616] to-[#16100A]",
    accent: "text-[#E3C48F]",
    chip: "from-[#E9DCC6] to-[#C6B79F]",
  },
  indigo: {
    gradient: "from-[#1E2140] to-[#0C0E22]",
    accent: "text-[#A3AEE3]",
    chip: "from-[#CCD2E9] to-[#9FA6C6]",
  },
};

// Tema do cartão: a cor ESCOLHIDA (colorPreset) tem prioridade; sem ela, cai no
// tema derivado da bandeira; sem nada, no neutro. Exportado para a pilha pintar
// a lombada de trás com a cor real do próximo cartão.
export function themeFor(card?: {
  brand?: string | null;
  colorPreset?: string | null;
}): BrandTheme {
  if (!card) return BRAND_THEMES.default;
  if (card.colorPreset) {
    const preset = CARD_COLOR_PRESETS[card.colorPreset];
    if (preset) return preset;
  }
  const brand = card.brand?.trim().toLowerCase();
  if (brand) return BRAND_THEMES[brand] ?? BRAND_THEMES.default;
  return BRAND_THEMES.default;
}

function maskedNumber(id: string): string {
  // 4 dígitos finais estáveis a partir do id (não guardamos PAN real).
  const digits = id.replace(/\D/g, "");
  const last4 = (digits.slice(-4) || "0000").padStart(4, "0");
  return `**** **** **** ${last4}`;
}

function formatBRL(value: number, fractionDigits = 0): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

// Cor da barra conforme a fração do limite consumida: tranquilo < 75% <=
// atenção < 90% <= estourando. >= 90% vira vermelho.
function usageBarColor(ratio: number): string {
  if (ratio >= 0.9) return "bg-red-400";
  if (ratio >= 0.75) return "bg-amber-400";
  return "bg-lima";
}

export function CreditCardVisual({ card }: CreditCardVisualProps) {
  const brand = (card.brand || "").trim();
  const brandLabel = brand ? brand.toUpperCase() : "CARTÃO";
  const theme = themeFor(card);

  const spent = card.currentSpend ?? 0;
  const limit = card.limit ? Number(card.limit) : null;
  // Fração 0–1 do limite usada (limitada a 1 para a largura da barra; o número
  // real ainda é exibido, podendo passar de 100%).
  const ratio = limit && limit > 0 ? spent / limit : 0;
  const barWidth = Math.min(ratio, 1) * 100;
  const pctLabel = limit && limit > 0 ? Math.round(ratio * 100) : null;

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
        <div className="flex gap-5">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-white/50">
              Fechamento
            </p>
            <p className="font-[family-name:var(--font-mono)] text-sm">
              dia {card.closingDay}
            </p>
          </div>
          {/* Vencimento só quando o cartão tem dueDay cadastrado. */}
          {card.dueDay != null && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-white/50">
                Vencimento
              </p>
              <p className="font-[family-name:var(--font-mono)] text-sm">
                dia {card.dueDay}
              </p>
            </div>
          )}
        </div>
        {limit !== null ? (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-white/50">
              Limite
            </p>
            <p className="font-[family-name:var(--font-mono)] text-sm">
              {formatBRL(limit)}
            </p>
          </div>
        ) : (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-white/50">
              Fatura atual
            </p>
            <p className="font-[family-name:var(--font-mono)] text-sm">
              {formatBRL(spent)}
            </p>
          </div>
        )}
      </div>

      {/* Barra de uso do limite — só quando há limite definido. */}
      {limit !== null && limit > 0 && (
        <div className="relative mt-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            {/* Micro-rótulo: com limite, o valor da fatura fica anônimo acima da
                barra. "Fatura" deixa claro o que é o número. */}
            <span className="font-[family-name:var(--font-mono)] text-xs text-white/85">
              <span className="mr-1 font-[family-name:var(--font-body)] text-[10px] uppercase tracking-wide text-white/50">
                Fatura
              </span>
              {formatBRL(spent)}
            </span>
            <span className="text-[10px] font-medium text-white/55">
              {pctLabel}% usado
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${usageBarColor(
                ratio,
              )}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
