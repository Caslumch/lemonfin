"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { ArrowRight, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Wallet, PiggyBank, AlertTriangle, Target } from "lucide-react";
import { CategoryIcon, CategoryIconWithBg } from "@/components/ui/category-icon";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ContentHeader } from "@/components/layout/content-header";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { EvolutionChart } from "@/components/dashboard/evolution-chart";
import { useApi } from "@/hooks/use-api";
import type {
  Transaction,
  TransactionSummary,
  MonthlyBreakdown,
  CategoryBreakdown as CategoryBreakdownType,
  PaginatedResponse,
  InsightsData,
  SpendingAlert,
} from "@/types/transaction";
import type { Goal } from "@/types/goal";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(date));
}

function WelcomeToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const welcomeShown = useRef(false);

  useEffect(() => {
    if (searchParams.get("welcome") === "1" && !welcomeShown.current) {
      welcomeShown.current = true;
      const firstName = session?.user?.name?.split(" ")[0] ?? "";
      toast(`Bem-vindo(a)${firstName ? `, ${firstName}` : ""}!`, {
        description: "Sua conta esta pronta. Bora organizar suas financas!",
      });
      router.replace("/");
    }
  }, [searchParams, session, router]);

  return null;
}

export default function DashboardPage() {
  const { fetchApi } = useApi();

  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyBreakdown[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdownType[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<SpendingAlert[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const [summaryRes, monthlyRes, categoryRes, recentRes, insightsRes, goalsRes] =
        await Promise.all([
          fetchApi<TransactionSummary>("/transactions/summary"),
          fetchApi<MonthlyBreakdown[]>("/transactions/monthly?months=6"),
          fetchApi<CategoryBreakdownType[]>("/transactions/by-category"),
          fetchApi<PaginatedResponse<Transaction>>(
            "/transactions?perPage=5&page=1",
          ),
          fetchApi<InsightsData>("/transactions/insights").catch(() => null),
          fetchApi<Goal[]>("/goals").catch(() => [] as Goal[]),
        ]);

      setSummary(summaryRes);
      setMonthly(monthlyRes);
      setCategories(categoryRes);
      setRecent(recentRes.data);
      if (insightsRes) setAlerts(insightsRes.alerts);
      setGoals(goalsRes);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [fetchApi]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Silent polling every 60s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [summaryRes, monthlyRes, categoryRes, recentRes, insightsRes, goalsRes] =
          await Promise.all([
            fetchApi<TransactionSummary>("/transactions/summary"),
            fetchApi<MonthlyBreakdown[]>("/transactions/monthly?months=6"),
            fetchApi<CategoryBreakdownType[]>("/transactions/by-category"),
            fetchApi<PaginatedResponse<Transaction>>(
              "/transactions?perPage=5&page=1",
            ),
            fetchApi<InsightsData>("/transactions/insights").catch(() => null),
            fetchApi<Goal[]>("/goals").catch(() => [] as Goal[]),
          ]);
        setSummary(summaryRes);
        setMonthly(monthlyRes);
        setCategories(categoryRes);
        setRecent(recentRes.data);
        if (insightsRes) setAlerts(insightsRes.alerts);
        setGoals(goalsRes);
      } catch {
        // Silent fail
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchApi]);

  // Calculate month-over-month variation from monthly breakdown
  const currentMonthData = monthly.length > 0 ? monthly[monthly.length - 1] : null;
  const prevMonthData = monthly.length > 1 ? monthly[monthly.length - 2] : null;

  function calcVariation(current: number, previous: number): number | null {
    if (!prevMonthData || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  }

  const stats = [
    {
      label: "Saldo",
      value: summary?.balance ?? 0,
      icon: Wallet,
      color: (summary?.balance ?? 0) >= 0 ? "text-success" : "text-danger",
      bg: "bg-muted",
      variation: calcVariation(
        currentMonthData?.balance ?? 0,
        prevMonthData?.balance ?? 0,
      ),
    },
    {
      label: "Entradas",
      value: summary?.income ?? 0,
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success-muted",
      variation: calcVariation(
        currentMonthData?.income ?? 0,
        prevMonthData?.income ?? 0,
      ),
    },
    {
      label: "Saidas",
      value: summary?.expense ?? 0,
      icon: TrendingDown,
      color: "text-danger",
      bg: "bg-danger-muted",
      variation: calcVariation(
        currentMonthData?.expense ?? 0,
        prevMonthData?.expense ?? 0,
      ),
      invertColor: true, // gastos subindo = ruim
    },
    {
      label: "Economia",
      value: Math.max(0, (summary?.income ?? 0) - (summary?.expense ?? 0)),
      icon: PiggyBank,
      color: "text-lima",
      bg: "bg-lima-muted",
      variation: calcVariation(
        Math.max(0, (currentMonthData?.income ?? 0) - (currentMonthData?.expense ?? 0)),
        Math.max(0, (prevMonthData?.income ?? 0) - (prevMonthData?.expense ?? 0)),
      ),
    },
  ];

  return (
    <>
      <Suspense>
        <WelcomeToast />
      </Suspense>
      <ContentHeader title="Dashboard" />

      <div className="p-5 md:p-7 space-y-6">
        {/* Main balance card */}
        <div className="rounded-lg bg-dark text-white p-6 animate-fade-in-up">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-24 bg-gray-600 rounded" />
              <div className="h-10 w-48 bg-gray-600 rounded" />
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-1">Saldo total</p>
              <p
                className={cn(
                  "font-[family-name:var(--font-display)] text-4xl font-bold",
                  (summary?.balance ?? 0) >= 0
                    ? "text-lima"
                    : "text-danger",
                )}
              >
                {formatCurrency(summary?.balance ?? 0)}
              </p>
              <div className="flex gap-6 mt-3">
                <span className="text-sm text-success">
                  + {formatCurrency(summary?.income ?? 0)}
                </span>
                <span className="text-sm text-danger">
                  - {formatCurrency((summary?.expense ?? 0) - (summary?.cardExpense ?? 0))}
                </span>
                {(summary?.cardExpense ?? 0) > 0 && (
                  <span className="text-sm text-warning">
                    Fatura: {formatCurrency(summary?.cardExpense ?? 0)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-lg border border-border bg-surface p-4 animate-fade-in-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {loading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-3 w-16 bg-muted rounded" />
                    <div className="h-6 w-24 bg-muted rounded" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-md flex items-center justify-center",
                          stat.bg,
                        )}
                      >
                        <Icon size={14} className={stat.color} />
                      </div>
                      <span className="text-xs text-fg-muted">
                        {stat.label}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "font-[family-name:var(--font-display)] text-lg font-bold",
                        stat.color,
                      )}
                    >
                      {formatCurrency(stat.value)}
                    </p>
                    {stat.variation !== null && stat.variation !== undefined && (
                      <div
                        className={cn(
                          "flex items-center gap-0.5 mt-1",
                          stat.variation > 0
                            ? ("invertColor" in stat && stat.invertColor ? "text-danger" : "text-success")
                            : stat.variation < 0
                              ? ("invertColor" in stat && stat.invertColor ? "text-success" : "text-danger")
                              : "text-fg-muted",
                        )}
                      >
                        {stat.variation > 0 ? (
                          <ArrowUpRight size={12} />
                        ) : stat.variation < 0 ? (
                          <ArrowDownRight size={12} />
                        ) : null}
                        <span className="text-xs font-medium">
                          {stat.variation > 0 ? "+" : ""}
                          {stat.variation.toFixed(1)}%
                        </span>
                        <span className="text-xs text-fg-muted ml-0.5">
                          vs mes anterior
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Spending alerts */}
        {!loading && alerts.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning-muted p-4 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-warning" />
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-fg">
                  Alertas de gastos
                </h3>
              </div>
              <Link
                href="/insights"
                className="text-xs text-fg-muted hover:text-fg flex items-center gap-1 transition-colors"
              >
                Ver detalhes <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.categoryId}
                  className="flex items-center gap-2 text-sm"
                >
                  <CategoryIcon slug={alert.category?.slug} size={14} />
                  <span className="text-fg flex-1 truncate">
                    {alert.category?.name ?? "Outros"}
                  </span>
                  <span
                    className={cn(
                      "font-[family-name:var(--font-mono)] text-xs font-bold",
                      alert.percentOfPrevious >= 100
                        ? "text-danger"
                        : "text-warning",
                    )}
                  >
                    {Math.round(alert.percentOfPrevious)}% do mes anterior
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goals progress */}
        {!loading && goals.length > 0 && (
          <div className="rounded-lg border border-border bg-surface p-5 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-lima" />
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-fg">
                  Metas do mes
                </h3>
              </div>
              <Link
                href="/metas"
                className="text-xs text-fg-muted hover:text-fg flex items-center gap-1 transition-colors"
              >
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {goals.slice(0, 6).map((goal) => {
                const pct = goal.progress.percentage;
                const barColor = goal.progress.exceeded
                  ? "bg-danger"
                  : pct >= 80
                    ? "bg-warning"
                    : "bg-lima";
                return (
                  <div key={goal.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-fg truncate">
                        <CategoryIcon slug={goal.category?.slug} size={12} className="inline mr-1" />
                        {goal.category?.name}
                      </span>
                      <span
                        className={cn(
                          "font-medium",
                          goal.progress.exceeded
                            ? "text-danger"
                            : pct >= 80
                              ? "text-warning"
                              : "text-fg-muted",
                        )}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-subtle rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-fg-muted">
                      {formatCurrency(goal.progress.spent)} / {formatCurrency(goal.progress.limit)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <MonthlyChart data={monthly} loading={loading} />
          <CategoryBreakdown data={categories} loading={loading} />
        </div>

        {/* Evolution chart */}
        <EvolutionChart data={monthly} loading={loading} />

        {/* Recent transactions */}
        <div className="rounded-lg border border-border bg-surface p-5 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-fg">
              Transacoes recentes
            </h3>
            <Link
              href="/transacoes"
              className="text-xs text-fg-muted hover:text-fg flex items-center gap-1 transition-colors"
            >
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 bg-muted rounded" />
                    <div className="h-2.5 w-20 bg-muted rounded" />
                  </div>
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-6">
              Nenhuma transacao registrada ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {recent.map((tx, index) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0 animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CategoryIconWithBg
                    slug={tx.category.slug}
                    colorBg={tx.category.colorBg}
                    colorText={tx.category.colorText}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg truncate">
                      {tx.description || tx.category.name}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {formatDate(tx.date)}
                      {tx.user?.name && ` · ${tx.user.name.split(" ")[0]}`}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "font-[family-name:var(--font-mono)] text-sm font-medium shrink-0",
                      tx.type === "INCOME" ? "text-success" : "text-danger",
                    )}
                  >
                    {tx.type === "INCOME" ? "+" : "-"}{" "}
                    {formatCurrency(Number(tx.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
