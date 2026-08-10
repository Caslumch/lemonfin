import { useEffect } from "react";
import { View, type DimensionValue } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Card } from "./card";
import { useTheme } from "@/theme/use-theme";

// Bloco de skeleton com pulso suave (shimmer) via reanimated.
export function Skeleton({
  width = "100%",
  height,
  radius = 10,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
}) {
  const { palette } = useTheme();
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 850 }), -1, true);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: palette.muted }, style]}
    />
  );
}

// Linha de lista (ícone + 2 linhas) — extrato, recentes.
export function SkeletonRow() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12 }}>
      <Skeleton width={44} height={44} radius={12} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="55%" height={13} />
        <Skeleton width="35%" height={11} />
      </View>
      <Skeleton width={60} height={14} />
    </View>
  );
}

// Card genérico (título + bloco) — dashboard/seções.
export function SkeletonCard({ height = 90 }: { height?: number }) {
  return (
    <Card style={{ gap: 12 }}>
      <Skeleton width="40%" height={14} />
      <Skeleton width="100%" height={height} />
    </Card>
  );
}

// Lista de linhas dentro de um card — telas empilhadas.
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <Card>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </Card>
  );
}
