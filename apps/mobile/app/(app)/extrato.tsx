import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SkeletonList } from "@/components/ui/skeleton";
import { type ConfirmConfig, ConfirmSheet } from "@/components/confirm-sheet";
import { TransactionRow } from "@/components/transaction-row";
import { haptic } from "@/lib/haptics";
import {
  type Transaction,
  useDeleteTransaction,
  useInfiniteTransactions,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent } from "@/theme/tokens";

type Filter = "all" | "INCOME" | "EXPENSE";

export default function ExtratoScreen() {
  const { palette } = useTheme();
  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteTransactions();
  const del = useDeleteTransaction();
  const [filter, setFilter] = useState<Filter>("all");
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  const rows = useMemo(() => {
    const all = data?.pages.flatMap((p) => p.data) ?? [];
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
    haptic.warning();
    setConfirm({
      title: "Excluir transação",
      message: `Excluir "${tx.description || tx.category?.name || "transação"}"? Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      destructive: true,
      onConfirm: () =>
        del.mutate(tx.id, {
          onError: (e) => Alert.alert("Erro", (e as Error).message),
        }),
    });
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
        <SkeletonList rows={6} />
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
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={accent.primary}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color={accent.primary} />
            ) : null
          }
          ListEmptyComponent={
            <Txt variant="small" color={palette.textTertiary} style={{ marginTop: 24 }}>
              Nenhuma transação neste filtro.
            </Txt>
          }
        />
      )}
      <ConfirmSheet config={confirm} onClose={() => setConfirm(null)} />
    </Screen>
  );
}
