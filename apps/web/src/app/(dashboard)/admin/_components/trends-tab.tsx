"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { logApiError } from "@/lib/log-error";

interface Trends {
  newUsers: { day: string; count: number }[];
  transactions: { day: string; count: number }[];
  aiCost: { day: string; costUsd: number }[];
}

function Chart({
  title,
  data,
  dataKey,
  color,
}: {
  title: string;
  data: Record<string, unknown>[];
  dataKey: string;
  color: string;
}) {
  return (
    <div className="rounded-[20px] border border-border bg-surface shadow-xs p-5">
      <h3 className="mb-3 text-sm font-semibold text-fg">{title}</h3>
      <div className="h-48">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-fg-muted">
            Sem dados no período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "var(--color-fg-muted)" }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-fg-muted)" }} width={32} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12 }}
                labelFormatter={(d) => `Dia ${d}`}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function TrendsTab() {
  const { fetchApi, token } = useApi();
  const [trends, setTrends] = useState<Trends | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchApi<Trends>("/admin/trends")
      .then(setTrends)
      .catch((e) => logApiError("admin:trends", e));
  }, [fetchApi, token]);

  if (!trends) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-fg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-fg-muted">Últimos 30 dias.</p>
      <Chart
        title="Novos usuários por dia"
        data={trends.newUsers}
        dataKey="count"
        color="#84cc16"
      />
      <Chart
        title="Transações por dia"
        data={trends.transactions}
        dataKey="count"
        color="#6C5CE7"
      />
      <Chart
        title="Custo de IA por dia (USD)"
        data={trends.aiCost}
        dataKey="costUsd"
        color="#f59e0b"
      />
    </div>
  );
}
