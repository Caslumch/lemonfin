import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Switch, View } from "react-native";
import { StackHeader } from "@/components/ui/stack-header";
import { Card } from "@/components/ui/card";
import { Txt } from "@/components/ui/text";
import {
  type Recurring,
  useMaterializeRecurring,
  useRecurring,
  useToggleRecurring,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent, fonts } from "@/theme/tokens";
import { formatBRL } from "@/lib/format";

function Row({ item, first }: { item: Recurring; first?: boolean }) {
  const { palette } = useTheme();
  const toggle = useToggleRecurring();
  const materialize = useMaterializeRecurring();
  const isIncome = item.type === "INCOME";

  function launch() {
    Alert.alert("Lançar agora", `Lançar "${item.description}" como transação deste mês?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Lançar",
        onPress: () =>
          materialize.mutate(item.id, {
            onSuccess: () => Alert.alert("Pronto", "Recorrente lançada."),
            onError: (e) => Alert.alert("Não foi possível", (e as Error).message),
          }),
      },
    ]);
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: palette.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, opacity: item.active ? 1 : 0.5 }}>
        <Txt style={{ fontSize: 17 }}>{item.category?.icon ?? "🔁"}</Txt>
        <View style={{ flex: 1 }}>
          <Txt variant="bodyMedium" numberOfLines={1}>
            {item.description}
          </Txt>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Txt variant="small" color={palette.textTertiary}>
              dia {item.dayOfMonth}
              {item.card ? ` • ${item.card.name}` : ""}
            </Txt>
            <Pressable onPress={launch} hitSlop={6} disabled={materialize.isPending}>
              <Txt variant="small" color={accent.uva} style={{ fontFamily: fonts.sansSemi }}>
                Lançar agora
              </Txt>
            </Pressable>
          </View>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Txt style={{ fontFamily: fonts.mono, fontSize: 14 }} color={isIncome ? accent.success : palette.text}>
          {isIncome ? "+ " : "- "}
          {formatBRL(item.amount)}
        </Txt>
        <Switch
          value={item.active}
          onValueChange={(v) => toggle.mutate({ id: item.id, active: v })}
          trackColor={{ true: accent.primary, false: palette.muted }}
          thumbColor="#FFFFFF"
        />
      </View>
    </View>
  );
}

export default function RecorrentesScreen() {
  const { palette } = useTheme();
  const { data, isLoading, refetch, isRefetching } = useRecurring();
  const items = data?.data ?? [];
  const monthlyExpense = data?.meta?.monthlyExpense ?? 0;
  const monthlyIncome = data?.meta?.monthlyIncome ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <StackHeader title="Recorrentes" />
      {isLoading ? (
        <ActivityIndicator color={palette.text} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={accent.primary} />}
        >
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Card style={{ flex: 1 }} padding={16}>
              <Txt variant="small" color={palette.textTertiary}>Despesas fixas/mês</Txt>
              <Txt style={{ fontFamily: fonts.outfit, fontSize: 18 }} color={accent.danger}>
                {formatBRL(monthlyExpense)}
              </Txt>
            </Card>
            <Card style={{ flex: 1 }} padding={16}>
              <Txt variant="small" color={palette.textTertiary}>Receitas fixas/mês</Txt>
              <Txt style={{ fontFamily: fonts.outfit, fontSize: 18 }} color={accent.success}>
                {formatBRL(monthlyIncome)}
              </Txt>
            </Card>
          </View>

          {items.length === 0 ? (
            <Txt variant="small" color={palette.textTertiary}>
              Nenhuma recorrente. Crie despesas/receitas fixas no app web.
            </Txt>
          ) : (
            <Card>
              {items.map((it, i) => (
                <Row key={it.id} item={it} first={i === 0} />
              ))}
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}
