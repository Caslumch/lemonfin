// Design tokens do mobile — ALINHADOS ao web (apps/web/src/app/globals.css).
// Lima é o primário; UVA (#6C5CE7) é o acento secundário (nav ativo, ícones de
// stat, gráficos, botões +). Camada dark fiel ao web.

// Acentos e semânticas — CONSTANTES nos dois temas.
export const accent = {
  primary: "#D4F400", // lima
  primaryHover: "#BDD900",
  primaryMuted: "#D4F40018",
  primaryText: "#0D0D0D",
  uva: "#6C5CE7", // grape (acento secundário)
  uvaHover: "#5544D6",
  uvaMuted: "#6C5CE718",
  uvaText: "#FFFFFF",
  success: "#22C55E",
  successMuted: "#22C55E1F",
  danger: "#EF4444",
  dangerMuted: "#EF44441F",
  warning: "#F59E0B",
  warningMuted: "#F59E0B1F",
} as const;

// Superfícies por tema.
export const palettes = {
  light: {
    bg: "#F4F4F2", // page
    surface: "#FFFFFF",
    surfaceRaised: "#FAFAF9",
    surfaceElevated: "#F1F1EF", // = subtle (mantido p/ compat)
    surfaceAccent: "#0D0D0D", // card preto de destaque
    subtle: "#F1F1EF",
    muted: "#E8E8E5",
    border: "rgba(13,13,13,0.07)",
    text: "#0D0D0D", // fg
    textSecondary: "#6B6B6B",
    textTertiary: "#9E9E9E",
    onDark: "#FFFFFF",
    onDarkMuted: "rgba(255,255,255,0.58)",
  },
  dark: {
    bg: "#111113",
    surface: "#1A1A1D",
    surfaceRaised: "#222226",
    surfaceElevated: "#222226",
    surfaceAccent: "#000000",
    subtle: "#222226",
    muted: "#2E2E33",
    border: "rgba(255,255,255,0.07)",
    text: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textTertiary: "#6B6B70",
    onDark: "#FFFFFF",
    onDarkMuted: "rgba(255,255,255,0.58)",
  },
} as const;

export type Palette = { [K in keyof (typeof palettes)["light"]]: string };
export type ColorScheme = keyof typeof palettes;

// Raio (usos do web: cards 20, container de cartões 24, chip de ícone 12,
// cartão de crédito 18).
export const radii = {
  sm: 8,
  chip: 12,
  md: 12,
  lg: 16,
  card: 20,
  xl: 24,
  sheet: 28,
  full: 9999,
} as const;

// Famílias de fonte (nomes dos módulos @expo-google-fonts carregados no _layout).
export const fonts = {
  outfit: "Outfit_700Bold",
  outfitSemi: "Outfit_600SemiBold",
  sans: "DMSans_400Regular",
  sansMedium: "DMSans_500Medium",
  sansSemi: "DMSans_700Bold", // DM Sans não empacota 600
  mono: "JetBrainsMono_500Medium",
} as const;

// Cor da categoria. No tema claro usa o bg/text do próprio registro (API).
// No escuro: tinta translúcida da cor + a própria cor como acento.
export function categoryColors(
  scheme: ColorScheme,
  colorBg?: string | null,
  colorText?: string | null,
) {
  const fg = colorText || accent.uva;
  if (scheme === "dark") {
    return { bg: `${fg}22`, fg };
  }
  return { bg: colorBg || palettes.light.subtle, fg };
}
