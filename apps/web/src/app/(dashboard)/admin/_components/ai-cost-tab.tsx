"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { logApiError } from "@/lib/log-error";

interface Spender {
  userId: string | null;
  name: string;
  email: string;
  costUsd: number;
  tokens: number;
}

function usd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function AiCostTab() {
  const { fetchApi, token } = useApi();
  const [rows, setRows] = useState<Spender[] | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchApi<Spender[]>("/admin/ai-cost/top")
      .then(setRows)
      .catch((e) => logApiError("admin:ai-cost", e));
  }, [fetchApi, token]);

  if (!rows) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-fg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-border bg-surface shadow-xs p-6">
      <h3 className="mb-1 text-sm font-semibold text-fg">
        Top consumidores de IA
      </h3>
      <p className="mb-4 text-xs text-fg-muted">Últimos 30 dias · custo estimado.</p>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-fg-secondary">
          Nenhum consumo de IA no período.
        </p>
      ) : (
        <div className="space-y-1">
          {rows.map((r, i) => (
            <div
              key={r.userId ?? i}
              className="flex items-center gap-3 rounded-[12px] border border-border bg-page px-4 py-2.5"
            >
              <span className="w-5 text-xs font-semibold text-fg-muted">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{r.name}</p>
                <p className="truncate text-xs text-fg-muted">{r.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-fg">{usd(r.costUsd)}</p>
                <p className="text-[11px] text-fg-muted">
                  {r.tokens.toLocaleString("pt-BR")} tokens
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
