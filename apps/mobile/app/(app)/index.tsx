import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonCard, SkeletonRow } from "@/components/ui/skeleton";
import { BalanceCard } from "@/components/balance-card";
import { LimaoInput } from "@/components/limao-input";
import { TransactionRow } from "@/components/transaction-row";
import { StatCard } from "@/components/dashboard/stat-card";
import { ForecastCard } from "@/components/dashboard/forecast-card";
import { AlertsCard } from "@/components/dashboard/alerts-card";
import { ReceitaSparkline } from "@/components/charts/receita-sparkline";
import { MonthlyBarChart } from "@/components/charts/monthly-bar-chart";
import { CardsPreview } from "@/components/dashboard/cards-preview";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { useAuth } from "@/providers/auth-provider";
import {
  useCards,
  useForecast,
  useInsights,
  useMonthly,
  useSummary,
  useTransactions,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent, fonts } from "@/theme/tokens";
import { formatBRL } from "@/lib/format";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia,";
  if (h < 18) return "Boa tarde,";
  return "Boa noite,";
}

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <Txt variant="section" style={{ fontSize: 16 }}>
        {title}
      </Txt>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Txt variant="small" color={palette.textTertiary}>
            {action} →
          </Txt>
        </Pressable>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { palette } = useTheme();
  const summary = useSummary();
  const txs = useTransactions();
  const monthly = useMonthly();
  const forecast = useForecast();
  const insights = useInsights();
  const cards = useCards();

  const income = Number(summary.data?.income ?? 0);
  const expense = Number(summary.data?.expense ?? 0);
  const cardExpense = Number(summary.data?.cardExpense ?? 0);
  const balance = Number(summary.data?.balance ?? income - expense);
  const recent = txs.data?.data?.slice(0, 5) ?? [];
  const firstName = user?.name?.split(" ")[0] ?? "";

  const months = monthly.data ?? [];
  const incomes = months.map((m) => m.income);
  const lastInc = incomes[incomes.length - 1] ?? 0;
  const prevInc = incomes[incomes.length - 2] ?? 0;
  const incVar = prevInc > 0 ? ((lastInc - prevInc) / prevInc) * 100 : 0;
  const alerts = insights.data?.alerts ?? [];

  const refreshing =
    summary.isRefetching || txs.isRefetching || monthly.isRefetching || forecast.isRefetching;
  const onRefresh = () => {
    summary.refetch();
    txs.refetch();
    monthly.refetch();
    forecast.refetch();
    insights.refetch();
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent.primary} />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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
          <Pressable onPress={onRefresh} hitSlop={8}>
            <Ionicons name="refresh" size={22} color={palette.textSecondary} />
          </Pressable>
        </View>

        {summary.isLoading ? (
          <View style={{ gap: 16 }}>
            <Skeleton width="100%" height={132} radius={24} />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <SkeletonCard height={36} />
              </View>
              <View style={{ flex: 1 }}>
                <SkeletonCard height={36} />
              </View>
            </View>
            <Skeleton width="100%" height={58} radius={16} />
            <SkeletonCard height={120} />
          </View>
        ) : (
          <>
            <BalanceCard balance={balance} income={income} expense={expense} />

            {/* Gastos + Economia */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <StatCard
                label="Gastos do mês"
                value={expense + cardExpense}
                icon="trending-down"
                tone="uva"
              />
              <StatCard
                label="Economia"
                value={Math.max(0, balance)}
                icon="wallet-outline"
                tone="lima"
              />
            </View>

            {/* Atalhos rápidos (Metas, Reservas, Recorrentes…) */}
            <QuickActions />

            <LimaoInput />

            {/* Últimas transações */}
            <Card>
              <SectionHeader
                title="Últimas transações"
                action="Ver todas"
                onAction={() => router.navigate("/extrato")}
              />
              {recent.length === 0 ? (
                <Txt variant="small" color={palette.textTertiary}>
                  Nenhuma transação ainda. Mande um gasto no WhatsApp para começar.
                </Txt>
              ) : (
                recent.map((tx, i) => (
                  <TransactionRow key={tx.id} tx={tx} showDivider={i > 0} />
                ))
              )}
            </Card>

            {/* Meus Cartões */}
            {(cards.data?.length ?? 0) > 0 && <CardsPreview cards={cards.data ?? []} />}

            {/* Receita + sparkline */}
            {months.length >= 2 && (
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Txt variant="section" style={{ fontSize: 16 }}>
                    Receita
                  </Txt>
                  <Txt variant="small" color={palette.textTertiary}>
                    6 meses
                  </Txt>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 8 }}>
                  <Txt style={{ fontFamily: fonts.outfit, fontSize: 24 }}>{formatBRL(income)}</Txt>
                  {Math.abs(incVar) >= 1 && (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons
                        name={incVar >= 0 ? "arrow-up" : "arrow-down"}
                        size={14}
                        color={incVar >= 0 ? accent.success : accent.danger}
                      />
                      <Txt variant="small" color={incVar >= 0 ? accent.success : accent.danger}>
                        {Math.abs(Math.round(incVar))}%
                      </Txt>
                    </View>
                  )}
                </View>
                <ReceitaSparkline values={incomes} />
              </Card>
            )}

            {/* Gastos mensais */}
            {months.length > 0 && (
              <Card>
                <Txt variant="section" style={{ fontSize: 16, marginBottom: 14 }}>
                  Gastos mensais
                </Txt>
                <MonthlyBarChart data={months} />
              </Card>
            )}

            {/* Forecast */}
            {forecast.data && <ForecastCard data={forecast.data} />}

            {/* Alertas */}
            {alerts.length > 0 && <AlertsCard alerts={alerts} />}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
