import { Text as RNText, type TextProps, type TextStyle } from "react-native";
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

const VARIANTS: Record<Variant, TextStyle> = {
  balance: { fontFamily: fonts.outfit, fontSize: 40, lineHeight: 44 },
  title: { fontFamily: fonts.outfit, fontSize: 24, lineHeight: 30 },
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

// Tipografia do DS. Cor default segue o tema (palette.text); passe `color`
// para acentos (success/danger) ou texto sobre superfícies escuras fixas.
export function Txt({ variant = "body", color, style, ...props }: Props) {
  const { palette } = useTheme();
  return (
    <RNText
      style={[VARIANTS[variant], { color: color ?? palette.text }, style]}
      {...props}
    />
  );
}
