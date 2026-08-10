"use client";

import { useEffect, useState, useCallback } from "react";
import { WelcomeSplash } from "@/components/ui/welcome-splash";

/**
 * Flag deixada pelo login logo antes do redirect. sessionStorage (e não state)
 * porque o router.push remonta a árvore — o sinal precisa sobreviver à troca de
 * rota, mas morrer quando a aba fecha.
 */
export const WELCOME_SPLASH_KEY = "lf:welcome-splash";

/** Marca que o próximo carregamento do dashboard deve abrir com a splash. */
export function armWelcomeSplash() {
  try {
    sessionStorage.setItem(WELCOME_SPLASH_KEY, "1");
  } catch {
    // Modo privado / storage bloqueado: sem splash, o login segue normal.
  }
}

/**
 * Mostra a splash só quando o login acabou de acontecer.
 *
 * Deliberadamente NÃO dispara a cada abertura do app: quem já tem sessão abre a
 * aba pra ver o saldo, e uma tela no caminho vira obstáculo depois do segundo dia.
 */
export function WelcomeSplashGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(WELCOME_SPLASH_KEY) !== "1") return;
      // Consome na hora: um F5 durante a splash não deve trazê-la de volta.
      sessionStorage.removeItem(WELCOME_SPLASH_KEY);
      setShow(true);
    } catch {
      // Sem storage não há flag — nada a fazer.
    }
  }, []);

  const handleDone = useCallback(() => setShow(false), []);

  if (!show) return null;
  return <WelcomeSplash onDone={handleDone} />;
}
