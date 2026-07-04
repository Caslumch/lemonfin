import { View, type ViewProps } from "react-native";
import { radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

interface CardProps extends ViewProps {
  padding?: number;
  radius?: keyof typeof radii;
}

// Card do DS: superfície do tema, raio lg (default), borda no tema escuro
// (elevação = mudança de superfície, não sombra).
export function Card({
  padding = 16,
  radius = "lg",
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
          borderWidth: isDark ? 1 : 0,
          borderColor: palette.border,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
