import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SkeletonList } from "@/components/ui/skeleton";
import { type ConfirmConfig, ConfirmSheet } from "@/components/confirm-sheet";
import { TransactionRow } from "@/components/transaction-row";
import { haptic } from "@/lib/haptics";
import {
  type Transaction,
  useCategories,
  useDeleteTransaction,
  useInfiniteTransactions,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent, fonts, radii } from "@/theme/tokens";

type Filter = "all" | "INCOME" | "EXPENSE";
type Period = "all" | "month" | "last";

const PERIODS: { key: Period; label: string }[] = [
  { key: "all", label: "Tudo" },
  { key: "month", label: "Este mês" },
  { key: "last", label: "Mês passado" },
];

function periodRange(p: Period): { startDate?: string; endDate?: string } {
  if (p === "all") return {};
  const now = new Date();
  if (p === "month") {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      endDate: now.toISOString(),
    };
  }
  return {
    startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
    endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString(),
  };
}

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function ExtratoScreen() {
  const { palette } = useTheme();
  const categories = useCategories();

  const [type, setType] = useState<Filter>("all");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("all");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput.trim(), 350);

  const filters = useMemo(() => {
    const { startDate, endDate } = periodRange(period);
    return {
      type: type === "all" ? undefined : type,
      categoryId: categoryId ?? undefined,
      search: search || undefined,
      startDate,
      endDate,
    };
  }, [type, categoryId, period, search]);

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteTransactions(filters);
  const del = useDeleteTransaction();
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  const rows = data?.pages.flatMap((p) => p.data) ?? [];

  function handleEdit(tx: Transaction) {
    // Compra parcelada: a linha representativa (1ª parcela) tem installmentTotal
    // >= 2. Edita o GRUPO inteiro — valor exibido = total (installmentSum), e a
    // data já é a da 1ª parcela.
    const isGroup = (tx.installmentTotal ?? 0) >= 2;
    const totalCents = isGroup
      ? Math.round(Number(tx.installmentSum ?? Number(tx.amount) * (tx.installmentTotal ?? 1)) * 100)
      : Math.round(Number(tx.amount) * 100);
    // Descrição sem o sufixo "(n/N)" que o backend acrescenta às parcelas.
    const desc = (tx.description ?? "").replace(/\s*\(\d+\/\d+\)\s*$/, "");
    router.push({
      pathname: "/nova",
      params: {
        id: tx.id,
        cents: String(totalCents),
        type: tx.type,
        categoryId: tx.categoryId ?? "",
        description: desc,
        cardId: tx.cardId ?? "",
        date: tx.date,
        ...(isGroup ? { installments: String(tx.installmentTotal) } : {}),
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
      <View style={{ paddingTop: 8, paddingBottom: 12, gap: 12 }}>
        <Txt variant="title">Extrato</Txt>

        {/* Busca */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: palette.surface,
            borderRadius: radii.chip,
            paddingHorizontal: 14,
            height: 44,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Ionicons name="search" size={18} color={palette.textTertiary} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Buscar"
            placeholderTextColor={palette.textTertiary}
            style={{ flex: 1, color: palette.text, fontFamily: fonts.sans, fontSize: 15 }}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchInput ? (
            <Pressable onPress={() => setSearchInput("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={palette.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        <SegmentedControl<Filter>
          value={type}
          onChange={setType}
          segments={[
            { key: "all", label: "Geral" },
            { key: "INCOME", label: "Entradas" },
            { key: "EXPENSE", label: "Saídas" },
          ]}
        />

        {/* Categoria */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 8, paddingRight: 4 }}
        >
          <Chip label="Todas" active={!categoryId} onPress={() => setCategoryId(null)} />
          {(categories.data ?? []).map((c) => (
            <Chip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
        </ScrollView>

        {/* Período */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 8, paddingRight: 4 }}
        >
          {PERIODS.map((p) => (
            <Chip key={p.key} label={p.label} active={period === p.key} onPress={() => setPeriod(p.key)} />
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <SkeletonList rows={6} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
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
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={accent.primary} />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color={accent.primary} />
            ) : null
          }
          ListEmptyComponent={
            <Txt variant="small" color={palette.textTertiary} style={{ marginTop: 24 }}>
              Nenhuma transação com esses filtros.
            </Txt>
          }
        />
      )}
      <ConfirmSheet config={confirm} onClose={() => setConfirm(null)} />
    </Screen>
  );
}
