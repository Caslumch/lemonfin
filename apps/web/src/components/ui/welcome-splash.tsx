"use client";

import { useEffect, useState } from "react";
import { LemonLogo } from "@/components/ui/lemon-logo";
import { randomLoadingPhrase } from "@/lib/lemon-phrases";

/**
 * Tempo no ar antes de começar a sair. Descontando a entrada da frase, sobra
 * ~1,4s de leitura — 900ms não dava tempo de ler e ficava no pior meio-termo:
 * demorado demais pra passar batido, curto demais pra ser lido.
 */
const HOLD_MS = 1600;
/** Duração do fade de saída — casa com animate-lemon-splash-out. */
const FADE_MS = 420;

interface WelcomeSplashProps {
  /** Chamado quando o fade termina e a tela pode ser desmontada. */
  onDone?: () => void;
}

/**
 * Boas-vindas pós-login: logo + uma frase da marca, sem spinner.
 *
 * Spinner junto de frase divertida manda sinais contraditórios (um diz "espera",
 * o outro diz "relaxa"), então aqui o limão pulsando faz o papel de "tá vivo".
 *
 * Tempo fixo por ora: mostra, segura, some. Não espera os dados do dashboard —
 * amarrar ao fetch real é o passo seguinte, quando valer o toque no /page.tsx.
 */
export function WelcomeSplash({ onDone }: WelcomeSplashProps) {
  // Sorteio no mount, não no render: server e client renderizariam frases
  // diferentes e o React acusaria hydration mismatch.
  const [phrase, setPhrase] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setPhrase(randomLoadingPhrase());
  }, []);

  useEffect(() => {
    const toFade = setTimeout(() => setLeaving(true), HOLD_MS);
    const toDone = setTimeout(() => onDone?.(), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(toFade);
      clearTimeout(toDone);
    };
  }, [onDone]);

  return (
    <div
      // aria-hidden: é decorativa e some sozinha; anunciá-la só atrapalharia
      // quem usa leitor de tela a chegar no dashboard.
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-shell-sidebar ${
        leaving ? "animate-lemon-splash-out" : ""
      }`}
    >
      <div className="animate-lemon-pop-in">
        <div className="animate-lemon-breathe">
          <LemonLogo size={88} />
        </div>
      </div>

      {/* min-h reserva a linha: sem isso o limão pula quando a frase aparece. */}
      <p
        className="animate-fade-in-up min-h-[1.75rem] max-w-[19rem] px-6 text-center font-display text-lg text-on-dark"
        style={{ animationDelay: "120ms" }}
      >
        {phrase}
      </p>
    </div>
  );
}
