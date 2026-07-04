import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/providers/auth-provider";
import { useSummary } from "@/hooks/use-financial-data";
import { formatBRL } from "@/lib/format";
import { colors } from "@/theme/colors";

function StatCard({
  label,
  value,
  tone = "dark",
}: {
  label: string;
  value: number;
  tone?: "dark" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : "text-dark";
  return (
    <View className="flex-1 gap-1 rounded-2xl bg-white p-4">
      <Text className="font-sans text-xs text-gray-500">{label}</Text>
      <Text className={`font-mono text-lg ${toneClass}`}>{formatBRL(value)}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useSummary();

  const income = Number(data?.income ?? 0);
  const expense = Number(data?.expense ?? 0);
  const balance = Number(data?.balance ?? income - expense);

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="gap-4 p-6"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <View className="gap-1">
          <Text className="font-sans text-base text-gray-500">
            Olá, {user?.name?.split(" ")[0] ?? "bem-vindo"} 👋
          </Text>
          <Text className="font-heading-bold text-2xl text-dark">
            Seu mês
          </Text>
        </View>

        {isLoading ? (
          <View className="items-center py-10">
            <ActivityIndicator color={colors.dark} />
          </View>
        ) : (
          <>
            <View className="gap-1 rounded-2xl bg-dark p-5">
              <Text className="font-sans text-xs text-gray-400">
                Saldo do mês
              </Text>
              <Text className="font-mono text-3xl text-primary">
                {formatBRL(balance)}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <StatCard label="Entradas" value={income} tone="success" />
              <StatCard label="Saídas" value={expense} tone="danger" />
            </View>

            {data?.cardInvoice !== undefined && (
              <StatCard label="Fatura do cartão" value={Number(data.cardInvoice)} />
            )}

            <Text className="pt-2 text-center font-sans text-xs text-gray-400">
              Registre gastos direto no WhatsApp — aparecem aqui.
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
