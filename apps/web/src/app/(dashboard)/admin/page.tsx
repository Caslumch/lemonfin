"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Users,
  Sparkles,
  Activity,
  MessageCircle,
  Cpu,
} from "lucide-react";
import { ContentHeader } from "@/components/layout/content-header";
import { useApi } from "@/hooks/use-api";
import { logApiError } from "@/lib/log-error";

interface Profile {
  isSuperAdmin?: boolean;
}

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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
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
    <div className="rounded-[20px] border border-border bg-surface shadow-xs p-6 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-lima" />
        <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-fg">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}

export default function AdminPage() {
  const { fetchApi, token } = useApi();
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchApi<Profile>("/users/me")
      .then((p) => {
        if (!active) return;
        if (!p.isSuperAdmin) {
          setState("denied");
          router.replace("/");
          return;
        }
        setState("ok");
        return fetchApi<Metrics>("/admin/metrics").then((m) => {
          if (active) setMetrics(m);
        });
      })
      .catch((e) => {
        if (!active) return;
        logApiError("admin:load", e);
        setState("denied");
        router.replace("/");
      });
    return () => {
      active = false;
    };
  }, [fetchApi, token, router]);

  if (state !== "ok") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={24} className="animate-spin text-fg-muted" />
      </div>
    );
  }

  return (
    <>
      <ContentHeader title="Administração" />
      <div className="px-5 pb-8 pt-2 md:px-8 max-w-3xl space-y-6">
        {!metrics ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-fg-muted" />
          </div>
        ) : (
          <>
            <Section icon={Users} title="Usuários">
              <Stat label="Total" value={String(metrics.users.total)} />
              <Stat
                label="Novos (7 dias)"
                value={String(metrics.users.newLast7Days)}
              />
              <Stat
                label="Novos (30 dias)"
                value={String(metrics.users.newLast30Days)}
              />
              <Stat
                label="Trial ativo"
                value={String(metrics.users.trialActive)}
              />
              <Stat
                label="Trial expirado"
                value={String(metrics.users.trialExpired)}
              />
            </Section>

            <Section icon={Sparkles} title="Assinaturas">
              <Stat label="Ativas" value={String(metrics.subscriptions.active)} />
              <Stat
                label="Pagamento pendente"
                value={String(metrics.subscriptions.pastDue)}
              />
              <Stat
                label="Canceladas"
                value={String(metrics.subscriptions.canceled)}
              />
              <Stat
                label="MRR estimado"
                value={brl(metrics.subscriptions.mrrEstimateBRL)}
                hint="aprox. (ativas × R$14,90)"
              />
            </Section>

            <Section icon={Activity} title="Atividade">
              <Stat
                label="Transações (total)"
                value={String(metrics.activity.transactionsTotal)}
              />
              <Stat
                label="Transações (7 dias)"
                value={String(metrics.activity.transactionsLast7Days)}
              />
              <Stat
                label="Via WhatsApp"
                value={String(metrics.activity.bySource.whatsapp)}
              />
              <Stat
                label="Manuais"
                value={String(metrics.activity.bySource.manual)}
              />
              <Stat
                label="Recorrentes"
                value={String(metrics.activity.bySource.recurring)}
              />
            </Section>

            <Section icon={Cpu} title="Custo de IA">
              <Stat
                label="Custo total"
                value={usd(metrics.ai.costUsdTotal)}
              />
              <Stat
                label="Custo (30 dias)"
                value={usd(metrics.ai.costUsdLast30Days)}
              />
              <Stat
                label="Chamadas (total)"
                value={String(metrics.ai.callsTotal)}
              />
              <Stat
                label="Chamadas (30 dias)"
                value={String(metrics.ai.callsLast30Days)}
              />
              <Stat
                label="Tokens (total)"
                value={metrics.ai.tokensTotal.toLocaleString("pt-BR")}
              />
            </Section>

            <p className="flex items-center gap-1.5 text-xs text-fg-muted">
              <MessageCircle size={12} />
              MRR e custo de IA são estimativas (preços de modelo no código; não
              distinguimos mensal/anual no banco ainda).
            </p>
          </>
        )}
      </div>
    </>
  );
}
