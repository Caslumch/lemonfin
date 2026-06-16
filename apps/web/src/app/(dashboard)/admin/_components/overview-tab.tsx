"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Sparkles, Activity, Cpu } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { logApiError } from "@/lib/log-error";

interface Metrics {
  users: {
    total: number;
    newLast7Days: number;
    newLast30Days: number;
    trialActive: number;
    trialExpired: number;
  };
  subscriptions: {
    active: number;
    pastDue: number;
    canceled: number;
    mrrEstimateBRL: number;
  };
  activity: {
    transactionsTotal: number;
    transactionsLast7Days: number;
    bySource: { whatsapp: number; manual: number; recurring: number };
  };
  ai: {
    callsTotal: number;
    callsLast30Days: number;
    costUsdTotal: number;
    costUsdLast30Days: number;
    tokensTotal: number;
  };
}

function usd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}
function brl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[16px] border border-border bg-page px-4 py-3">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-fg">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-fg-muted">{hint}</p>}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Users;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-border bg-surface shadow-xs p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={18} className="text-lima" />
        <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-fg">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}

export function OverviewTab() {
  const { fetchApi, token } = useApi();
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchApi<Metrics>("/admin/metrics")
      .then(setM)
      .catch((e) => logApiError("admin:metrics", e));
  }, [fetchApi, token]);

  if (!m) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-fg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section icon={Users} title="Usuários">
        <Stat label="Total" value={String(m.users.total)} />
        <Stat label="Novos (7 dias)" value={String(m.users.newLast7Days)} />
        <Stat label="Novos (30 dias)" value={String(m.users.newLast30Days)} />
        <Stat label="Trial ativo" value={String(m.users.trialActive)} />
        <Stat label="Trial expirado" value={String(m.users.trialExpired)} />
      </Section>

      <Section icon={Sparkles} title="Assinaturas">
        <Stat label="Ativas" value={String(m.subscriptions.active)} />
        <Stat label="Pagamento pendente" value={String(m.subscriptions.pastDue)} />
        <Stat label="Canceladas" value={String(m.subscriptions.canceled)} />
        <Stat
          label="MRR estimado"
          value={brl(m.subscriptions.mrrEstimateBRL)}
          hint="aprox. (ativas × R$14,90)"
        />
      </Section>

      <Section icon={Activity} title="Atividade">
        <Stat
          label="Transações (total)"
          value={String(m.activity.transactionsTotal)}
        />
        <Stat
          label="Transações (7 dias)"
          value={String(m.activity.transactionsLast7Days)}
        />
        <Stat label="Via WhatsApp" value={String(m.activity.bySource.whatsapp)} />
        <Stat label="Manuais" value={String(m.activity.bySource.manual)} />
        <Stat label="Recorrentes" value={String(m.activity.bySource.recurring)} />
      </Section>

      <Section icon={Cpu} title="Custo de IA">
        <Stat label="Custo total" value={usd(m.ai.costUsdTotal)} />
        <Stat label="Custo (30 dias)" value={usd(m.ai.costUsdLast30Days)} />
        <Stat label="Chamadas (total)" value={String(m.ai.callsTotal)} />
        <Stat label="Chamadas (30 dias)" value={String(m.ai.callsLast30Days)} />
        <Stat
          label="Tokens (total)"
          value={m.ai.tokensTotal.toLocaleString("pt-BR")}
        />
      </Section>

      <p className="text-xs text-fg-muted">
        MRR e custo de IA são estimativas (preços de modelo no código; não
        distinguimos mensal/anual no banco ainda).
      </p>
    </div>
  );
}
