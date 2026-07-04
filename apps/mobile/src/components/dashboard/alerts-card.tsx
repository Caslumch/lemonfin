import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Txt } from "@/components/ui/text";
import { type SpendingAlert } from "@/hooks/use-financial-data";
import { accent, fonts, radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

// "Alertas de gastos" — card tinta de aviso. Cada linha: categoria + % vs mês
// anterior (danger se ≥100, warning caso contrário).
export function AlertsCard({ alerts }: { alerts: SpendingAlert[] }) {
  const { palette } = useTheme();
  const top = alerts.slice(0, 3);

  return (
    <View
      style={{
        backgroundColor: accent.warningMuted,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: `${accent.warning}4D`,
        padding: 20,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="warning-outline" size={18} color={accent.warning} />
        <Txt variant="section" style={{ fontSize: 16 }}>
          Alertas de gastos
        </Txt>
      </View>

      {top.map((a) => {
        const over = a.percentOfPrevious >= 100;
        return (
          <View key={a.categoryId} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <Txt style={{ fontSize: 15 }}>{a.category?.icon ?? "⚠️"}</Txt>
              <Txt variant="small" color={palette.text} numberOfLines={1}>
                {a.category?.name ?? "Outros"}
              </Txt>
            </View>
            <Txt
              style={{ fontFamily: fonts.mono, fontSize: 13 }}
              color={over ? accent.danger : accent.warning}
            >
              {Math.round(a.percentOfPrevious)}% do mês anterior
            </Txt>
          </View>
        );
      })}
    </View>
  );
}
