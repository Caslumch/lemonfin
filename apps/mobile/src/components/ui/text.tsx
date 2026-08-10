import {
  StyleSheet,
  Text as RNText,
  type TextProps,
  type TextStyle,
} from "react-native";
import { fonts } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type Variant =
  | "balance"
  | "title"
  | "section"
  | "body"
  | "bodyMedium"
  | "small"
  | "caption"
  | "mono";

// lineHeights generosas (Outfit é uma fonte alta — lineHeight apertada CORTA
// o topo/base das letras grandes).
const VARIANTS: Record<Variant, TextStyle> = {
  balance: { fontFamily: fonts.outfit, fontSize: 40, lineHeight: 50 },
  title: { fontFamily: fonts.outfit, fontSize: 24, lineHeight: 32 },
  section: { fontFamily: fonts.outfitSemi, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.sansMedium, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  caption: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 0.66,
    textTransform: "uppercase",
  },
  mono: { fontFamily: fonts.mono, fontSize: 14 },
};

interface Props extends TextProps {
  variant?: Variant;
  color?: string; // sobrepõe a cor; default = texto primário do tema
}

// Tipografia do DS. Cor default segue o tema. Se o call site sobrescreve o
// fontSize via `style` sem lineHeight, recalcula uma lineHeight proporcional —
// senão herdaria a da variante (pequena) e cortaria o texto.
export function Txt({ variant = "body", color, style, ...props }: Props) {
  const { palette } = useTheme();
  const v = VARIANTS[variant];
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const fontSize = flat.fontSize ?? v.fontSize ?? 16;
  const lineHeight =
    flat.lineHeight ??
    (flat.fontSize != null ? Math.round(fontSize * 1.25) : v.lineHeight);
  return (
    <RNText
      style={[v, { color: color ?? palette.text }, style, { lineHeight, includeFontPadding: false }]}
      {...props}
    />
  );
}
