"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import type { BillingCycle } from "@/lib/billing";
import { PRICE_LABEL } from "@/lib/billing";

const BENEFITS = [
  "LemonFin no WhatsApp, ilimitado",
  "Painel financeiro completo",
  "Categorização automática por IA",
  "Metas e alertas de limite",
  "Conta compartilhada com a família",
  "Resumo no WhatsApp",
];

/**
 * Paywall dedicado. O PaywallGuard manda pra cá quem está sem acesso. A página
 * NÃO depende de query params do Stripe — só oferece os planos e dispara o
 * checkout. (O retorno do checkout cai em /assinar/sucesso.)
 */
export default function AssinarPage() {
  const { fetchApi } = useApi();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState<BillingCycle | null>(null);

  async function handleCheckout(cycle: BillingCycle) {
    setRedirecting(cycle);
    try {
      const { url } = await fetchApi<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ cycle }),
      });
      window.location.assign(url);
    } catch {
      toast.error("Não foi possível iniciar o checkout. Tente novamente.");
      setRedirecting(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center px-5 py-10">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lima/15">
        <Sparkles size={26} className="text-lima" />
      </div>

      <h1 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-bold text-fg">
        Seu acesso expirou
      </h1>
      <p className="mt-2 text-sm text-fg-secondary">
        Assine para continuar usando o LemonFin — seus dados estão salvos e
        voltam assim que você ativar.
      </p>

      <ul className="mt-6 space-y-2">
        {BENEFITS.map((b) => (
          <li key={b} className="flex items-center gap-2 text-sm text-fg">
            <Check size={16} className="shrink-0 text-lima" />
            {b}
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {(["monthly", "yearly"] as BillingCycle[]).map((cycle) => (
          <button
            key={cycle}
            type="button"
            onClick={() => handleCheckout(cycle)}
            disabled={!!redirecting}
            className={
              "flex flex-col items-start gap-1 rounded-[16px] border-[1.5px] p-4 text-left transition-colors disabled:opacity-60 " +
              (cycle === "yearly"
                ? "border-lima bg-lima/5 hover:bg-lima/10"
                : "border-border bg-surface hover:border-fg")
            }
          >
            <span className="text-sm font-semibold text-fg">
              {cycle === "yearly" ? "Anual" : "Mensal"}
            </span>
            <span className="font-[family-name:var(--font-display)] text-xl font-bold text-fg">
              {PRICE_LABEL[cycle]}
            </span>
            {cycle === "yearly" && (
              <span className="text-xs font-medium text-lima">
                2 meses grátis
              </span>
            )}
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-fg-muted">
              {redirecting === cycle ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Redirecionando...
                </>
              ) : (
                "Assinar"
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/configuracoes")}
          disabled={!!redirecting}
        >
          Ir para configurações
        </Button>
      </div>
    </div>
  );
}
