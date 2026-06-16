"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import type { BillingStatus } from "@/lib/billing";

// Retorno do Checkout do Stripe. O status real chega pelo webhook, que pode
// demorar alguns segundos — então fazemos um polling curto até virar ACTIVE
// (ou desistimos e mostramos "processando", sem travar o usuário).
const MAX_TRIES = 5;
const INTERVAL_MS = 1500;

export default function AssinarSucessoPage() {
  const { fetchApi, token } = useApi();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let tries = 0;

    async function poll() {
      try {
        const status = await fetchApi<BillingStatus>("/billing/status");
        if (cancelled) return;
        if (status.subscriptionStatus === "ACTIVE") {
          setActive(true);
          setDone(true);
          return;
        }
      } catch {
        // ignora; tenta de novo até o limite
      }
      tries += 1;
      if (tries >= MAX_TRIES) {
        if (!cancelled) setDone(true);
        return;
      }
      setTimeout(poll, INTERVAL_MS);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [fetchApi, token]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-lima/15">
        {done ? (
          <Sparkles size={28} className="text-lima" />
        ) : (
          <Loader2 size={28} className="animate-spin text-lima" />
        )}
      </div>

      <h1 className="mt-5 font-[family-name:var(--font-display)] text-xl font-bold text-fg">
        {!done
          ? "Confirmando seu pagamento..."
          : active
            ? "Bem-vindo ao Premium! 🎉"
            : "Pagamento recebido"}
      </h1>

      <p className="mt-2 max-w-sm text-sm text-fg-secondary">
        {!done
          ? "Só um instante enquanto ativamos sua assinatura."
          : active
            ? "Sua assinatura está ativa. Aproveite o LemonFin completo."
            : "Estamos finalizando a ativação. Isso pode levar alguns minutos — você já pode usar o app normalmente."}
      </p>

      {done && (
        <div className="mt-6 flex gap-3">
          <Button onClick={() => router.push("/")}>Ir para o início</Button>
          <Button
            variant="outline"
            onClick={() => router.push("/configuracoes")}
          >
            Ver assinatura
          </Button>
        </div>
      )}
    </div>
  );
}
