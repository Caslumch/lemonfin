"use client";

import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import { useApi } from "@/hooks/use-api";

interface Profile {
  trialEndsAt: string | null;
}

// Só avisa nos últimos N dias do trial (decisão: "só quando estiver acabando").
const WARN_WITHIN_DAYS = 3;

// Dias inteiros (arredondando pra cima) até a data; negativo se já passou.
function daysUntil(date: Date, now: Date): number {
  const ms = date.getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * Aviso do trial de 7 dias. Pós-trial é SOFT: este banner só informa, nunca
 * bloqueia. Aparece apenas quando o trial está nos últimos WARN_WITHIN_DAYS dias
 * ou já expirou — fora disso, fica invisível.
 */
export function TrialBanner() {
  const { fetchApi, token } = useApi();
  const [endsAt, setEndsAt] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchApi<Profile>("/users/me")
      .then((p) => {
        if (!active) return;
        setEndsAt(p.trialEndsAt ? new Date(p.trialEndsAt) : null);
        setLoaded(true);
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [fetchApi, token]);

  if (!loaded || !endsAt || dismissed) return null;

  const days = daysUntil(endsAt, new Date());
  const expired = days <= 0;

  // Durante a maior parte do trial (mais de WARN_WITHIN_DAYS dias), não mostra.
  if (!expired && days > WARN_WITHIN_DAYS) return null;

  const label = expired
    ? "Seu período de teste grátis terminou."
    : days === 1
      ? "Seu teste grátis termina amanhã."
      : `Seu teste grátis termina em ${days} dias.`;

  // Expirado: tom neutro/uva. Acabando: âmbar de atenção.
  const tone = expired
    ? "border-uva/30 bg-uva/10 text-uva"
    : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200";

  return (
    <div
      className={`flex items-center gap-3 border-b px-4 py-2.5 text-sm md:px-6 ${tone}`}
    >
      <Clock size={16} className="shrink-0" />
      <p className="flex-1">{label}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dispensar aviso"
        className="shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10"
      >
        <X size={14} />
      </button>
    </div>
  );
}
