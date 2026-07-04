import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackHeader } from "@/components/ui/stack-header";
import { Card } from "@/components/ui/card";
import { Txt } from "@/components/ui/text";
import { AlertsCard } from "@/components/dashboard/alerts-card";
import { type CategoryComparison, useInsights } from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent, fonts } from "@/theme/tokens";
import { formatBRL } from "@/lib/format";

function variation(cur: number, prev: number): number {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

function CompareCard({
  label,
  value,
  varPct,
  goodWhenUp,
}: {
  label: string;
  value: number;
  varPct: number;
  goodWhenUp: boolean;
}) {
  const { palette } = useTheme();
  const up = varPct >= 0;
  const good = up === goodWhenUp;
  const color = Math.abs(varPct) < 1 ? palette.textTertiary : good ? accent.success : accent.danger;
  return (
    <Card padding={16} style={{ gap: 4 }}>
      <Txt variant="small" color={palette.textTertiary}>{label}</Txt>
      <Txt style={{ fontFamily: fonts.outfit, fontSize: 18 }} numberOfLines={1}>{formatBRL(value)}</Txt>
      {Math.abs(varPct) >= 1 && (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name={up ? "arrow-up" : "arrow-down"} size={13} color={color} />
          <Txt variant="small" color={color}>{Math.abs(Math.round(varPct))}%</Txt>
        </View>
      )}
    </Card>
  );
}

function TrendList({ title, items, positive }: { title: string; items: CategoryComparison[]; positive: boolean }) {
  const { palette } = useTheme();
  if (items.length === 0) return null;
  return (
    <Card style={{ gap: 8 }}>
      <Txt variant="section" style={{ fontSize: 15, marginBottom: 2 }}>{title}</Txt>
      {items.slice(0, 5).map((c) => (
        <View key={c.categoryId} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <Txt style={{ fontSize: 15 }}>{c.category?.icon ?? "•"}</Txt>
            <Txt variant="small" numberOfLines={1}>{c.category?.name}</Txt>
          </View>
          <Txt style={{ fontFamily: fonts.mono, fontSize: 13 }} color={positive ? accent.danger : accent.success}>
            {c.variation >= 0 ? "+" : ""}{Math.round(c.variation)}%
          </Txt>
        </View>
      ))}
    </Card>
  );
}

export default function InsightsScreen() {
  const { palette } = useTheme();
  const { data, isLoading, refetch, isRefetching } = useInsights();

  const cur = data?.currentMonth;
  const prev = data?.previousMonth;

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <StackHeader title="Insights" />
      {isLoading || !data ? (
        <ActivityIndicator color={palette.text} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={accent.primary} />}
        >
          {cur && prev && (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <CompareCard label="Gastos" value={cur.expense} varPct={variation(cur.expense, prev.expense)} goodWhenUp={false} />
              <CompareCard label="Receita" value={cur.income} varPct={variation(cur.income, prev.income)} goodWhenUp />
            </View>
          )}
          {data.alerts.length > 0 && <AlertsCard alerts={data.alerts} />}
          <TrendList title="Categorias que cresceram" items={data.topGrowing} positive />
          <TrendList title="Categorias que diminuíram" items={data.topShrinking} positive={false} />
        </ScrollView>
      )}
    </View>
  );
}
