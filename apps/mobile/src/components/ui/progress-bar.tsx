import { View } from "react-native";
import { useTheme } from "@/theme/use-theme";

// Barra de progresso (Metas, Reservas, Orçamento). Track = subtle; fill colorido.
export function ProgressBar({
  percentage,
  color,
  height = 6,
}: {
  percentage: number;
  color: string;
  height?: number;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        height,
        borderRadius: 9999,
        backgroundColor: palette.subtle,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: "100%",
          borderRadius: 9999,
          width: `${Math.min(Math.max(percentage, 0), 100)}%`,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
