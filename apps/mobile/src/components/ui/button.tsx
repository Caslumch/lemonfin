import { ActivityIndicator, Platform, Pressable, Text, type ViewStyle } from "react-native";
import { accent, fonts, radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { haptic } from "@/lib/haptics";

type Variant = "primary" | "secondary" | "outline" | "danger";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

// Botão do DS. Altura 52, raio lg, largura total por padrão. Estado desabilitado
// vira cinza SÓLIDO (continua parecendo botão); ativo sólido ganha sombra.
export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = true,
}: ButtonProps) {
  const { palette, isDark } = useTheme();
  const inactive = disabled || loading;
  const isOutline = variant === "outline";

  const base: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: accent.primary, fg: "#0D0D0D" },
    secondary: { bg: palette.text, fg: palette.bg },
    outline: { bg: "transparent", fg: palette.text, border: palette.border },
    danger: { bg: accent.danger, fg: "#FFFFFF" },
  };
  const s = base[variant];

  // Desabilitado: cinza sólido que CONTRASTA com o fundo do sheet (o `muted`
  // ficava quase igual à página e o botão "sumia"). Outline mantém a moldura.
  const disabledBg = isDark ? "#3A3A40" : "#D4D4D8";
  const disabledFg = isDark ? "#8A8A90" : "#8E8E8E";
  const bg = inactive && !isOutline ? disabledBg : s.bg;
  const fg = inactive ? disabledFg : s.fg;
  const borderColor = isOutline ? palette.border : undefined;

  const solidShadow: ViewStyle =
    !isOutline && !inactive
      ? Platform.OS === "ios"
        ? { shadowColor: s.bg, shadowOpacity: isDark ? 0.35 : 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }
        : { elevation: 3 }
      : {};

  const boxStyle: ViewStyle = {
    height: 52,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: bg,
    borderWidth: isOutline ? 1.5 : 0,
    borderColor,
    alignSelf: fullWidth ? "stretch" : "flex-start",
    ...solidShadow,
  };

  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress();
      }}
      disabled={inactive}
      style={({ pressed }) => [boxStyle, pressed && !inactive && { opacity: 0.88 }]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ fontFamily: fonts.outfitSemi, fontSize: 16, color: fg }}>{label}</Text>
      )}
    </Pressable>
  );
}
