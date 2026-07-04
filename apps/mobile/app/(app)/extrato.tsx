import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TransactionRow } from "@/components/transaction-row";
import {
  type Transaction,
  useDeleteTransaction,
  useTransactions,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent } from "@/theme/tokens";

type Filter = "all" | "INCOME" | "EXPENSE";

export default function ExtratoScreen() {
  const { palette } = useTheme();
  const { data, isLoading, refetch, isRefetching } = useTransactions();
  const del = useDeleteTransaction();
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    const all = data?.data ?? [];
    return filter === "all" ? all : all.filter((t) => t.type === filter);
  }, [data, filter]);

  function handleEdit(tx: Transaction) {
    router.push({
      pathname: "/nova",
      params: {
        id: tx.id,
        cents: String(Math.round(Number(tx.amount) * 100)),
        type: tx.type,
        categoryId: tx.categoryId ?? "",
        description: tx.description ?? "",
      },
    });
  }

  function handleDelete(tx: Transaction) {
    Alert.alert(
      "Excluir transação",
      `Excluir "${tx.description || tx.category?.name || "transação"}"? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () =>
            del.mutate(tx.id, {
              onError: (e) => Alert.alert("Erro", (e as Error).message),
            }),
        },
      ],
    );
  }

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
            <TransactionRow
              tx={item}
              showDivider={index > 0}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
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
