// Design System Mobile v1.0 — tokens (herda o web + camada dark).
// Fonte da verdade dos valores: apps/mobile/docs/design system mobile.

// Acentos e semânticas — CONSTANTES nos dois temas.
export const accent = {
  primary: "#D4F400",
  primaryHover: "#BDD900",
  primaryMuted: "#D4F40020",
  success: "#22C55E",
  successMuted: "#22C55E15",
  danger: "#EF4444",
  dangerMuted: "#EF444415",
  warning: "#F59E0B",
  warningMuted: "#F59E0B15",
} as const;

// Superfícies por tema.
export const palettes = {
  light: {
    bg: "#F9F9F9",
    surface: "#FFFFFF",
    surfaceElevated: "#F2F2F2",
    border: "#E5E5E5",
    text: "#0D0D0D",
    textSecondary: "#6B6B6B",
    textTertiary: "#9E9E9E",
  },
  dark: {
    bg: "#0D0D0D",
    surface: "#161616",
    surfaceElevated: "#242424",
    border: "#2A2A2A",
    text: "#F5F5F5",
    textSecondary: "#9E9E9E",
    textTertiary: "#7A7A7A",
  },
} as const;

export type Palette = { [K in keyof (typeof palettes)["light"]]: string };
export type ColorScheme = keyof typeof palettes;

// Raio (mais generoso que o web).
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  sheet: 28,
  full: 9999,
} as const;

// Famílias de fonte (nomes dos módulos @expo-google-fonts carregados no _layout).
export const fonts = {
  outfit: "Outfit_700Bold", // valores/títulos
  outfitSemi: "Outfit_600SemiBold", // seções
  sans: "DMSans_400Regular", // UI geral
  sansMedium: "DMSans_500Medium", // ênfase
  sansSemi: "DMSans_700Bold", // caption/overline, ênfase (DM Sans não tem 600)
  mono: "JetBrainsMono_500Medium", // números tabulares
} as const;

// Cor de categoria no tema escuro: fundo neutro elevado + acento no ícone/texto.
export function categoryColors(
  scheme: ColorScheme,
  colorBg?: string | null,
  colorText?: string | null,
) {
  const fg = colorText || accent.primary;
  if (scheme === "dark") {
    return { bg: palettes.dark.surfaceElevated, fg };
  }
  return { bg: colorBg || palettes.light.surfaceElevated, fg };
}
