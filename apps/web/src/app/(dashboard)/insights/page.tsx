"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentHeader } from "@/components/layout/content-header";
import { useApi } from "@/hooks/use-api";
import type {
  InsightsData,
  CategoryComparison,
  SpendingAlert,
} from "@/types/transaction";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function InsightsPage() {
  const { fetchApi } = useApi();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetchApi<InsightsData>("/transactions/insights");
      setData(res);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [fetchApi]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return (
    <>
      <ContentHeader title="Insights" />

      <div className="p-5 md:p-7 space-y-6">
        {/* Month comparison header */}
        <MonthComparisonCards data={data} loading={loading} />

        {/* Alerts section */}
        {!loading && data && data.alerts.length > 0 && (
          <AlertsSection alerts={data.alerts} />
        )}

        {/* Category comparisons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TrendSection
            title="Categorias que mais cresceram"
            icon={TrendingUp}
            items={data?.topGrowing ?? []}
            loading={loading}
            emptyText="Nenhuma categoria com aumento significativo."
            color="text-danger"
          />
          <TrendSection
            title="Categorias que mais diminuiram"
            icon={TrendingDown}
            items={data?.topShrinking ?? []}
            loading={loading}
            emptyText="Nenhuma categoria com reducao significativa."
            color="text-success"
          />
        </div>

        {/* Full comparison table */}
        <ComparisonTable
          items={data?.categoryComparisons ?? []}
          loading={loading}
        />
      </div>
    </>
  );
}

function MonthComparisonCards({
  data,
  loading,
}: {
  data: InsightsData | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface p-5 animate-pulse"
          >
            <div className="h-3 w-20 bg-muted rounded mb-3" />
            <div className="h-7 w-28 bg-muted rounded mb-2" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const incomeVariation =
    data.previousMonth.income > 0
      ? ((data.currentMonth.income - data.previousMonth.income) /
          data.previousMonth.income) *
        100
      : 0;

  const items = [
    {
      label: "Gastos este mes",
      value: data.currentMonth.expense,
      prev: data.previousMonth.expense,
      variation: data.overallVariation,
      invertColor: true,
      icon: BarChart3,
    },
    {
      label: "Receita este mes",
      value: data.currentMonth.income,
      prev: data.previousMonth.income,
      variation: incomeVariation,
      invertColor: false,
      icon: Target,
    },
    {
      label: "Saldo este mes",
      value: data.currentMonth.balance,
      prev: data.previousMonth.balance,
      variation:
        data.previousMonth.balance !== 0
          ? ((data.currentMonth.balance - data.previousMonth.balance) /
              Math.abs(data.previousMonth.balance)) *
            100
          : 0,
      invertColor: false,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-surface p-5 animate-fade-in-up"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Icon size={16} className="text-fg-muted" />
              <span className="text-xs text-fg-muted uppercase tracking-wide">
                {item.label}
              </span>
            </div>
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-fg">
              {formatCurrency(item.value)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-fg-muted">
                Mes anterior: {formatCurrency(item.prev)}
              </span>
              {item.variation !== 0 && (
                <VariationBadge
                  variation={item.variation}
                  invertColor={item.invertColor}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AlertsSection({ alerts }: { alerts: SpendingAlert[] }) {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning-muted p-5 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-warning" />
        <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-fg">
          Alertas de gastos
        </h3>
      </div>
      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <div
            key={alert.categoryId}
            className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0 animate-fade-in-up"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-sm bg-surface">
              {alert.category?.icon || "📦"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-fg font-medium">
                {alert.category?.name ?? "Outros"}
              </p>
              <p className="text-xs text-fg-muted">
                {formatCurrency(alert.currentTotal)} de{" "}
                {formatCurrency(alert.previousTotal)} do mes passado
              </p>
            </div>
            <div className="text-right shrink-0">
              <p
                className={cn(
                  "font-[family-name:var(--font-mono)] text-sm font-bold",
                  alert.percentOfPrevious >= 100
                    ? "text-danger"
                    : "text-warning",
                )}
              >
                {Math.round(alert.percentOfPrevious)}%
              </p>
              <p className="text-xs text-fg-muted">
                {alert.daysRemaining}d restantes
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendSection({
  title,
  icon: Icon,
  items,
  loading,
  emptyText,
  color,
}: {
  title: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  items: CategoryComparison[];
  loading: boolean;
  emptyText: string;
  color: string;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 bg-muted rounded-md" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-28 bg-muted rounded" />
              <div className="h-2 w-20 bg-muted rounded" />
            </div>
            <div className="h-4 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className={color} />
        <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-fg">
          {title}
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-fg-muted">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.categoryId}
              className="flex items-center gap-3 py-2 border-b border-border last:border-0 animate-fade-in-up"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="w-8 h-8 rounded-md flex items-center justify-center text-sm bg-muted">
                {item.category?.icon || "📦"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-fg">
                  {item.category?.name ?? "Outros"}
                </p>
                <p className="text-xs text-fg-muted">
                  {formatCurrency(item.previousTotal)} →{" "}
                  {formatCurrency(item.currentTotal)}
                </p>
              </div>
              <VariationBadge
                variation={item.variation}
                invertColor={color === "text-danger"}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ComparisonTable({
  items,
  loading,
}: {
  items: CategoryComparison[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5 animate-pulse">
        <div className="h-5 w-56 bg-muted rounded mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 bg-muted rounded-md" />
            <div className="flex-1 h-3 bg-muted rounded" />
            <div className="w-20 h-3 bg-muted rounded" />
            <div className="w-20 h-3 bg-muted rounded" />
            <div className="w-16 h-3 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-5 animate-fade-in-up">
      <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-fg mb-4">
        Comparativo completo por categoria
      </h3>

      {/* Header - hidden on mobile */}
      <div className="hidden md:grid md:grid-cols-[1fr_100px_100px_80px] gap-3 pb-2 border-b border-border mb-2">
        <span className="text-xs text-fg-muted uppercase tracking-wide">
          Categoria
        </span>
        <span className="text-xs text-fg-muted uppercase tracking-wide text-right">
          Mes anterior
        </span>
        <span className="text-xs text-fg-muted uppercase tracking-wide text-right">
          Mes atual
        </span>
        <span className="text-xs text-fg-muted uppercase tracking-wide text-right">
          Variacao
        </span>
      </div>

      <div className="space-y-1">
        {items.map((item, index) => (
          <div
            key={item.categoryId}
            className="flex items-center gap-3 py-2 border-b border-border last:border-0 animate-fade-in-up md:grid md:grid-cols-[1fr_100px_100px_80px]"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm shrink-0">
                {item.category?.icon || "📦"}
              </span>
              <span className="text-sm text-fg truncate">
                {item.category?.name ?? "Outros"}
              </span>
            </div>
            <span className="hidden md:block font-[family-name:var(--font-mono)] text-sm text-fg-muted text-right">
              {formatCurrency(item.previousTotal)}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-sm text-fg text-right shrink-0">
              {formatCurrency(item.currentTotal)}
            </span>
            <div className="flex justify-end shrink-0">
              <VariationBadge variation={item.variation} invertColor />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VariationBadge({
  variation,
  invertColor = false,
}: {
  variation: number;
  invertColor?: boolean;
}) {
  const isPositive = variation > 0;
  const isNegative = variation < 0;

  let colorClass = "text-fg-muted";
  if (isPositive)
    colorClass = invertColor ? "text-danger" : "text-success";
  if (isNegative)
    colorClass = invertColor ? "text-success" : "text-danger";

  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-medium", colorClass)}>
      {isPositive ? (
        <ArrowUpRight size={12} />
      ) : isNegative ? (
        <ArrowDownRight size={12} />
      ) : (
        <Minus size={12} />
      )}
      {isPositive ? "+" : ""}
      {Math.round(variation)}%
    </span>
  );
}
