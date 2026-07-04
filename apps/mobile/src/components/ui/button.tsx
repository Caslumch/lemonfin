import { ActivityIndicator, Pressable, Text, type ViewStyle } from "react-native";
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

// Botão do DS. Altura 52 (alvo de toque), raio lg, largura total por padrão
// (ação principal de tela). 4 variantes: primary/secondary/outline/danger.
export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = true,
}: ButtonProps) {
  const { palette } = useTheme();
  const inactive = disabled || loading;

  const styles: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: accent.primary, fg: "#0D0D0D" },
    secondary: { bg: palette.text, fg: palette.bg },
    outline: { bg: "transparent", fg: palette.text, border: palette.border },
    danger: { bg: accent.danger, fg: "#FFFFFF" },
  };
  const s = styles[variant];

  const boxStyle: ViewStyle = {
    height: 52,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: s.bg,
    borderWidth: s.border ? 1.5 : 0,
    borderColor: s.border,
    opacity: inactive ? 0.5 : 1,
    alignSelf: fullWidth ? "stretch" : "flex-start",
  };

  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress();
      }}
      disabled={inactive}
      style={({ pressed }) => [boxStyle, pressed && !inactive && { opacity: 0.85 }]}
    >
      {loading ? (
        <ActivityIndicator color={s.fg} />
      ) : (
        <Text style={{ fontFamily: fonts.outfitSemi, fontSize: 16, color: s.fg }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
