// Categoria como vem de GET /categories (sistema + da família).
export interface ManagedCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  colorBg: string;
  colorText: string;
  userId: string | null;
  editable: boolean;
}

// Paletas pré-definidas. As chaves devem casar com CATEGORY_COLOR_PRESETS do
// backend (apps/api/.../dtos/category.dto.ts).
export const COLOR_PRESETS = [
  { key: "laranja", colorBg: "#FFF3E0", colorText: "#E65100" },
  { key: "azul", colorBg: "#E3F2FD", colorText: "#1565C0" },
  { key: "roxo", colorBg: "#F3E5F5", colorText: "#7B1FA2" },
  { key: "vermelho", colorBg: "#FBE9E7", colorText: "#BF360C" },
  { key: "verde", colorBg: "#E8F5E9", colorText: "#2E7D32" },
  { key: "ciano", colorBg: "#E0F7FA", colorText: "#00838F" },
  { key: "amarelo", colorBg: "#FFF8E1", colorText: "#F57F17" },
  { key: "indigo", colorBg: "#EDE7F6", colorText: "#4527A0" },
  { key: "teal", colorBg: "#E0F2F1", colorText: "#00695C" },
  { key: "cinza", colorBg: "#F5F5F5", colorText: "#6B6B6B" },
] as const;

export type ColorPresetKey = (typeof COLOR_PRESETS)[number]["key"];

// Encontra a paleta pela cor de fundo (para pré-selecionar ao editar).
export function presetKeyFromColorBg(colorBg?: string): ColorPresetKey {
  return (
    COLOR_PRESETS.find((p) => p.colorBg === colorBg)?.key ?? COLOR_PRESETS[0].key
  );
}

// Sugestões de emoji para o seletor.
export const CATEGORY_EMOJIS = [
  "🐶", "🐱", "🐾", "🍔", "🍕", "☕", "🍺", "🍿",
  "🎬", "🎮", "🎵", "✈️", "🏖️", "🏠", "🚗", "⛽",
  "🚌", "💊", "🏥", "💪", "📚", "🎓", "👕", "🛍️",
  "🎁", "💻", "📱", "💰", "💳", "🌱", "🔧", "✂️",
  "🧾", "🐕", "👶", "🎂", "⚽", "🎨", "🧴", "🚿",
];
