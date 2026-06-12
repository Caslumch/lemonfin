"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MailWarning, X } from "lucide-react";
import { useApi } from "@/hooks/use-api";

interface Profile {
  emailVerifiedAt: string | null;
}

/**
 * Banner exibido no topo do dashboard enquanto o e-mail não foi confirmado.
 * A confirmação NÃO bloqueia o uso do app (decisão de produto) — este aviso é o
 * único nudge. Some sozinho quando emailVerifiedAt deixa de ser null.
 */
export function EmailVerificationBanner() {
  const { fetchApi, token } = useApi();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchApi<Profile>("/users/me")
      .then((p) => {
        if (active) setVerified(Boolean(p.emailVerifiedAt));
      })
      .catch(() => {
        // Falha silenciosa: na dúvida, não mostramos o banner para não poluir.
        if (active) setVerified(true);
      });
    return () => {
      active = false;
    };
  }, [fetchApi, token]);

  // Enquanto carrega, já confirmado, ou dispensado: não renderiza nada.
  if (verified === null || verified || dismissed) return null;

  return (
    <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 md:px-6">
      <MailWarning size={16} className="shrink-0" />
      <p className="flex-1">
        Confirme seu e-mail para manter sua conta segura.{" "}
        <Link
          href="/confirmar-email"
          className="font-semibold underline underline-offset-2 hover:opacity-80"
        >
          Confirmar agora
        </Link>
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dispensar aviso"
        className="shrink-0 rounded-md p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40"
      >
        <X size={14} />
      </button>
    </div>
  );
}
