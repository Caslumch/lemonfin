import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { Screen } from "@/components/ui/screen";
import {
  type Transaction,
  useTransactions,
} from "@/hooks/use-financial-data";
import { formatBRL, formatDateBR } from "@/lib/format";
import { colors } from "@/theme/colors";

function Row({ tx }: { tx: Transaction }) {
  const isIncome = tx.type === "INCOME";
  const amount = Number(tx.amount);
  return (
    <View className="flex-row items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <Text>{tx.category?.icon ?? "💸"}</Text>
        </View>
        <View>
          <Text className="font-sans-medium text-base text-dark">
            {tx.description || tx.category?.name || "Transação"}
          </Text>
          <Text className="font-sans text-xs text-gray-400">
            {tx.category?.name ?? "—"} · {formatDateBR(tx.date)}
          </Text>
        </View>
      </View>
      <Text
        className={`font-mono text-base ${isIncome ? "text-success" : "text-dark"}`}
      >
        {isIncome ? "+" : "-"}
        {formatBRL(Math.abs(amount))}
      </Text>
    </View>
  );
}

export default function TransactionsScreen() {
  const { data, isLoading, refetch, isRefetching } = useTransactions();

  return (
    <Screen>
      <View className="px-6 py-4">
        <Text className="font-heading-bold text-2xl text-dark">Transações</Text>
      </View>

      {isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={colors.dark} />
        </View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Row tx={item} />}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <Text className="px-6 py-10 text-center font-sans text-gray-400">
              Nenhuma transação ainda. Mande um gasto no WhatsApp para começar.
            </Text>
          }
        />
      )}
    </Screen>
  );
}
