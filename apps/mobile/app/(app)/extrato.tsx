import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TransactionRow } from "@/components/transaction-row";
import { useTransactions } from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent } from "@/theme/tokens";

type Filter = "all" | "INCOME" | "EXPENSE";

export default function ExtratoScreen() {
  const { palette } = useTheme();
  const { data, isLoading, refetch, isRefetching } = useTransactions();
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    const all = data?.data ?? [];
    return filter === "all" ? all : all.filter((t) => t.type === filter);
  }, [data, filter]);

  return (
    <Screen padded>
      <View style={{ paddingTop: 8, paddingBottom: 16, gap: 14 }}>
        <Txt variant="title">Extrato</Txt>
        <SegmentedControl<Filter>
          value={filter}
          onChange={setFilter}
          segments={[
            { key: "all", label: "Geral" },
            { key: "INCOME", label: "Entradas" },
            { key: "EXPENSE", label: "Saídas" },
          ]}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={palette.text} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TransactionRow tx={item} showDivider={index > 0} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={accent.primary}
            />
          }
          ListEmptyComponent={
            <Txt variant="small" color={palette.textTertiary} style={{ marginTop: 24 }}>
              Nenhuma transação neste filtro.
            </Txt>
          }
        />
      )}
    </Screen>
  );
}
