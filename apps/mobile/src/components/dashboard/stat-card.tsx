import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/card";
import { Txt } from "@/components/ui/text";
import { accent, fonts, radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { formatBRL } from "@/lib/format";

type Tone = "uva" | "lima";

// Stat card do dashboard (Gastos do mês / Economia). Ícone com fundo tint da
// cor (uva-muted / lima-muted), valor em Outfit.
export function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
}) {
  const { palette } = useTheme();
  const iconBg = tone === "uva" ? accent.uvaMuted : accent.primaryMuted;
  const iconColor = tone === "uva" ? accent.uva : accent.primary;

  return (
    <Card style={{ flex: 1 }} padding={16}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radii.chip,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Txt variant="small" color={palette.textTertiary}>
        {label}
      </Txt>
      <Txt style={{ fontFamily: fonts.outfit, fontSize: 20, marginTop: 2 }} numberOfLines={1}>
        {formatBRL(value)}
      </Txt>
    </Card>
  );
}
