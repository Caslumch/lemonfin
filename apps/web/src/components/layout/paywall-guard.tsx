"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import type { BillingStatus } from "@/lib/billing";

// Rotas acessíveis mesmo sem acesso premium: a própria tela de assinatura e
// Configurações (onde também dá pra assinar/gerenciar). Tudo o mais redireciona.
const ALLOWED_WHEN_BLOCKED = ["/assinar", "/configuracoes"];

/**
 * Paywall hard (lado web). Busca o status efetivo (family-aware) em
 * /billing/status; se o usuário não tem acesso, redireciona para /assinar.
 *
 * É o espelho do PremiumGuard do backend. O backend bloqueia escrita mesmo que
 * isto seja burlado — aqui é UX. Ambos só agem quando o enforcement está ligado;
 * com o paywall desligado, /billing/status devolve hasPremium=true durante o
 * trial vigente, então este guard não redireciona ninguém indevidamente.
 */
export function PaywallGuard() {
  const { fetchApi, token } = useApi();
  const router = useRouter();
  const pathname = usePathname();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchApi<BillingStatus>("/billing/status")
      .then((s) => {
        if (active) setBlocked(!s.hasPremium);
      })
      .catch(() => {
        // Em erro, não bloqueia (evita prender por falha de rede/endpoint).
        if (active) setBlocked(false);
      });
    return () => {
      active = false;
    };
  }, [fetchApi, token]);

  useEffect(() => {
    if (!blocked) return;
    const allowed = ALLOWED_WHEN_BLOCKED.some((p) => pathname.startsWith(p));
    if (!allowed) router.replace("/assinar");
  }, [blocked, pathname, router]);

  return null;
}
