import { View } from "react-native";
import { Txt } from "@/components/ui/text";
import { type MonthlyBreakdown } from "@/hooks/use-financial-data";
import { accent } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const label = (m: string) => MONTHS_PT[Number(m.slice(5, 7)) - 1] ?? "";

// Gráfico de gastos mensais (espelha monthly-chart do web). Barras cinza; o mês
// atual (último) em uva. Construído com Views — sem lib de gráfico.
export function MonthlyBarChart({
  data,
  height = 150,
}: {
  data: MonthlyBreakdown[];
  height?: number;
}) {
  const { palette } = useTheme();
  const max = Math.max(...data.map((d) => d.expense), 1);
  const barsH = height - 22;

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: barsH, gap: 10 }}>
        {data.map((d, i) => {
          const h = Math.max((d.expense / max) * barsH, 4);
          const isCurrent = i === data.length - 1;
          return (
            <View key={d.month} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: barsH }}>
              <View
                style={{
                  width: "72%",
                  maxWidth: 30,
                  height: h,
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                  backgroundColor: isCurrent ? accent.uva : palette.textTertiary,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", marginTop: 8, gap: 10 }}>
        {data.map((d) => (
          <Txt
            key={d.month}
            variant="small"
            color={palette.textTertiary}
            style={{ flex: 1, textAlign: "center", fontSize: 11 }}
          >
            {label(d.month)}
          </Txt>
        ))}
      </View>
    </View>
  );
}
