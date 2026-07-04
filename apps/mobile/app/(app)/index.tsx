import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { BalanceCard } from "@/components/balance-card";
import { LimaoInput } from "@/components/limao-input";
import { TransactionRow } from "@/components/transaction-row";
import { useAuth } from "@/providers/auth-provider";
import { useSummary, useTransactions } from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent, fonts } from "@/theme/tokens";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia,";
  if (h < 18) return "Boa tarde,";
  return "Boa noite,";
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { palette } = useTheme();
  const summary = useSummary();
  const txs = useTransactions();

  const income = Number(summary.data?.income ?? 0);
  const expense = Number(summary.data?.expense ?? 0);
  const balance = Number(summary.data?.balance ?? income - expense);
  const recent = txs.data?.data?.slice(0, 5) ?? [];
  const firstName = user?.name?.split(" ")[0] ?? "";
  const refreshing = summary.isRefetching || txs.isRefetching;
  const onRefresh = () => {
    summary.refetch();
    txs.refetch();
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accent.primary}
          />
        }
      >
        {/* Saudação + avatar */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: palette.text,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Txt style={{ fontFamily: fonts.outfit, fontSize: 17 }} color={palette.bg}>
              {(firstName[0] ?? "?").toUpperCase()}
            </Txt>
          </View>
          <View>
            <Txt variant="small" color={palette.textTertiary}>
              {greeting()}
            </Txt>
            <Txt style={{ fontFamily: fonts.outfit, fontSize: 16 }}>{firstName}</Txt>
          </View>
        </View>

        {summary.isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator color={palette.text} />
          </View>
        ) : (
          <BalanceCard balance={balance} income={income} expense={expense} />
        )}

        <View style={{ height: 16 }} />
        <LimaoInput />

        <Txt variant="section" style={{ marginTop: 24, marginBottom: 8 }}>
          Recentes
        </Txt>
        {txs.isLoading ? (
          <ActivityIndicator color={palette.text} style={{ marginTop: 16 }} />
        ) : recent.length === 0 ? (
          <Txt variant="small" color={palette.textTertiary} style={{ marginTop: 12 }}>
            Nenhuma transação ainda. Mande um gasto no WhatsApp para começar.
          </Txt>
        ) : (
          recent.map((tx, i) => (
            <TransactionRow key={tx.id} tx={tx} showDivider={i > 0} />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
