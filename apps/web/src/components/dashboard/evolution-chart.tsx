"use client";

import {
  LineChart,
  Line,
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

interface EvolutionChartProps {
  data: MonthlyBreakdown[];
  loading?: boolean;
}

export function EvolutionChart({ data, loading }: EvolutionChartProps) {
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

  const chartData = data.map((d) => ({
    ...d,
    label: MONTH_NAMES[d.month.split("-")[1]] ?? d.month,
  }));

  return (
    <div className="rounded-lg border border-border bg-surface p-5 animate-fade-in-up">
      <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-fg mb-4">
        Evolucao mensal
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
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
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                name === "income" ? "Entradas" : name === "expense" ? "Saidas" : "Saldo",
              ]}
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#22C55E"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="#EF4444"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="var(--color-lima)"
              strokeWidth={2}
              dot={{ r: 3 }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-5 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-success rounded" />
          <span className="text-xs text-fg-muted">Entradas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-danger rounded" />
          <span className="text-xs text-fg-muted">Saidas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-lima rounded" style={{ borderStyle: "dashed" }} />
          <span className="text-xs text-fg-muted">Saldo</span>
        </div>
      </div>
    </div>
  );
}
