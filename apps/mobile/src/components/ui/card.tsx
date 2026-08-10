import { Platform, View, type ViewProps } from "react-native";
import { radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

interface CardProps extends ViewProps {
  padding?: number;
  radius?: keyof typeof radii;
}

// Card do app (alinhado ao web): superfície + borda fina + raio 20 + sombra
// sutil no claro (elevação por superfície no escuro).
export function Card({
  padding = 20,
  radius = "card",
  style,
  children,
  ...props
}: CardProps) {
  const { palette, isDark } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: palette.surface,
          borderRadius: radii[radius],
          padding,
          borderWidth: 1,
          borderColor: palette.border,
          ...(!isDark && Platform.OS === "ios"
            ? { shadowColor: "#0D0D0D", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }
            : {}),
          ...(!isDark && Platform.OS === "android" ? { elevation: 1 } : {}),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
