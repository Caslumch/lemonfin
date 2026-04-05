"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyBreakdown } from "@/types/transaction";

const MONTH_NAMES: Record<string, string> = {
  "01": "Jan",
  "02": "Fev",
  "03": "Mar",
  "04": "Abr",
  "05": "Mai",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Set",
  "10": "Out",
  "11": "Nov",
  "12": "Dez",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value);
}

interface MonthlyChartProps {
  data: MonthlyBreakdown[];
  loading?: boolean;
}

export function MonthlyChart({ data, loading }: MonthlyChartProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5 animate-fade-in-up">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const chartData = data.map((d) => ({
    ...d,
    label: MONTH_NAMES[d.month.split("-")[1]] ?? d.month,
    isCurrent: d.month === currentMonth,
  }));

  return (
    <div className="rounded-lg border border-border bg-surface p-5 animate-fade-in-up">
      <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-fg mb-4">
        Gastos mensais
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={28}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-fg-muted)", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-fg-muted)", fontSize: 11 }}
              tickFormatter={(v) => formatCurrency(v)}
              width={70}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), "Gastos"]}
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Bar
              dataKey="expense"
              radius={[4, 4, 0, 0]}
              fill="var(--color-fg-muted)"
              activeBar={{ fill: "var(--color-lima)" }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
