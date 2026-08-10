// Temas do cartão de crédito — 1:1 com o web (credit-card-visual.tsx).
// Gradientes grafite/neutros com um acento sóbrio por bandeira/preset.
import { accent } from "./tokens";

export interface CardTheme {
  gradient: [string, string]; // top-left → bottom-right
  accent: string;
  chip: [string, string];
}

const WHITE70 = "rgba(255,255,255,0.7)";

const BRAND_THEMES: Record<string, CardTheme> = {
  visa: { gradient: ["#1A2A3A", "#0C1622"], accent: "#8FB3D9", chip: ["#C9D6E3", "#9FB2C6"] },
  mastercard: { gradient: ["#2A2622", "#161310"], accent: "#D9A88F", chip: ["#E3D2C9", "#C6AC9F"] },
  elo: { gradient: ["#1C1C1E", "#0A0A0B"], accent: "#C9C9CE", chip: ["#D4D4D8", "#A1A1AA"] },
  amex: { gradient: ["#1A2A2A", "#0C1818"], accent: "#8FD9C9", chip: ["#C9E3DD", "#9FC6BC"] },
  hipercard: { gradient: ["#2A1C1E", "#160C0E"], accent: "#D98F95", chip: ["#E3C9CC", "#C69FA3"] },
  default: { gradient: ["#26262A", "#121214"], accent: WHITE70, chip: ["#D4D4D8", "#A1A1AA"] },
};

const CARD_COLOR_PRESETS: Record<string, CardTheme> = {
  grafite: { gradient: ["#26262A", "#121214"], accent: WHITE70, chip: ["#D4D4D8", "#A1A1AA"] },
  azul: { gradient: ["#1A2A3A", "#0C1622"], accent: "#8FB3D9", chip: ["#C9D6E3", "#9FB2C6"] },
  roxo: { gradient: ["#2A2140", "#140F22"], accent: "#B9A8E3", chip: ["#D6CCE9", "#B2A3C6"] },
  verde: { gradient: ["#1C2E22", "#0C160F"], accent: "#9FD9AF", chip: ["#C9E3D2", "#9FC6AC"] },
  vinho: { gradient: ["#3A1C24", "#1A0C12"], accent: "#D98FA3", chip: ["#E3C9D2", "#C69FAC"] },
  teal: { gradient: ["#16302E", "#0A1614"], accent: "#8FD9CE", chip: ["#C9E3DE", "#9FC6BF"] },
  ambar: { gradient: ["#332616", "#16100A"], accent: "#E3C48F", chip: ["#E9DCC6", "#C6B79F"] },
  indigo: { gradient: ["#1E2140", "#0C0E22"], accent: "#A3AEE3", chip: ["#CCD2E9", "#9FA6C6"] },
};

export const CARD_PRESET_KEYS = [
  "grafite", "azul", "roxo", "verde", "vinho", "teal", "ambar", "indigo",
] as const;

export function themeFor(card?: { brand?: string | null; colorPreset?: string | null }): CardTheme {
  if (!card) return BRAND_THEMES.default;
  if (card.colorPreset) {
    const preset = CARD_COLOR_PRESETS[card.colorPreset];
    if (preset) return preset;
  }
  const brand = card.brand?.trim().toLowerCase();
  if (brand) return BRAND_THEMES[brand] ?? BRAND_THEMES.default;
  return BRAND_THEMES.default;
}

// 4 dígitos finais estáveis a partir do id (não guardamos PAN real).
export function maskedNumber(id: string): string {
  const digits = id.replace(/\D/g, "");
  const last4 = (digits.slice(-4) || "0000").padStart(4, "0");
  return `**** **** **** ${last4}`;
}

// Cor da barra de uso: <75% lima, 75–90% âmbar, ≥90% vermelho.
export function usageBarColor(ratio: number): string {
  if (ratio >= 0.9) return "#F87171";
  if (ratio >= 0.75) return "#FBBF24";
  return accent.primary;
}
