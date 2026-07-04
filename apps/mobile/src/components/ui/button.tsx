import { useState } from "react";
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

// Botão do DS. IMPORTANTE: o `style` do Pressable é ESTÁTICO (array), não uma
// função — o NativeWind/css-interop ignora o style-como-função no Pressable, o
// que fazia o botão renderizar só o texto (sem caixa/cor).
export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = true,
}: ButtonProps) {
  const { palette, isDark } = useTheme();
  const [pressed, setPressed] = useState(false);
  const inactive = disabled || loading;
  const isOutline = variant === "outline";

  const base: Record<Variant, { bg: string; fg: string }> = {
    primary: { bg: accent.primary, fg: "#0D0D0D" },
    secondary: { bg: palette.text, fg: palette.bg },
    outline: { bg: "transparent", fg: palette.text },
    danger: { bg: accent.danger, fg: "#FFFFFF" },
  };
  const s = base[variant];

  const disabledBg = isDark ? "#3A3A40" : "#D4D4D8";
  const disabledFg = isDark ? "#8A8A90" : "#8E8E8E";
  const bg = inactive && !isOutline ? disabledBg : s.bg;
  const fg = inactive ? disabledFg : s.fg;

  const boxStyle: ViewStyle = {
    height: 52,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: bg,
    borderWidth: isOutline ? 1.5 : 0,
    borderColor: isOutline ? palette.border : undefined,
    alignSelf: fullWidth ? "stretch" : "flex-start",
    opacity: pressed && !inactive ? 0.85 : 1,
    // Sombra (iOS shadow* / Android elevation) só no botão sólido ativo.
    ...(!isOutline && !inactive
      ? {
          shadowColor: bg,
          shadowOpacity: 0.3,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }
      : {}),
  };

  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={inactive}
      style={boxStyle}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ fontFamily: fonts.outfitSemi, fontSize: 16, color: fg }}>{label}</Text>
      )}
    </Pressable>
  );
}
