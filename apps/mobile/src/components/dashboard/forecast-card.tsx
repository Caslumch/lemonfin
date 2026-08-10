import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Txt } from "@/components/ui/text";
import { type Forecast } from "@/hooks/use-financial-data";
import { accent, fonts, radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { formatBRL } from "@/lib/format";

// "Previsão de fim do mês" — card escuro, valor projetado em lima (ou danger se
// negativo) + breakdown (saldo hoje, a receber, a pagar, gastos estimados).
export function ForecastCard({ data }: { data: Forecast }) {
  const { palette } = useTheme();
  const positive = data.projectedBalance >= 0;

  return (
    <View
      style={{
        backgroundColor: palette.surfaceAccent,
        borderRadius: radii.card,
        padding: 20,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="time-outline" size={16} color={palette.onDarkMuted} />
        <Txt variant="small" color={palette.onDarkMuted}>
          Previsão de fim do mês
        </Txt>
      </View>

      <Txt
        style={{ fontFamily: fonts.outfit, fontSize: 34 }}
        color={positive ? accent.primary : accent.danger}
      >
        {formatBRL(data.projectedBalance)}
      </Txt>
      <Txt variant="small" color={palette.onDarkMuted}>
        faltam {data.daysRemaining} dias no mês
      </Txt>

      <View style={{ gap: 4, marginTop: 10 }}>
        <Txt variant="small" color={palette.onDark}>
          Saldo hoje: {formatBRL(data.currentBalance)}
        </Txt>
        {data.pendingIncome > 0 && (
          <Txt variant="small" color={accent.success}>
            + {formatBRL(data.pendingIncome)} a receber
          </Txt>
        )}
        {data.pendingExpense > 0 && (
          <Txt variant="small" color={accent.danger}>
            − {formatBRL(data.pendingExpense)} a pagar
          </Txt>
        )}
        {data.estimatedVariableExpense > 0 && (
          <Txt variant="small" color={accent.danger}>
            − {formatBRL(data.estimatedVariableExpense)} gastos estimados
          </Txt>
        )}
      </View>
    </View>
  );
}
