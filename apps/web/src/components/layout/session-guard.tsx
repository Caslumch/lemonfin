"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

// Derruba a sessão quando a renovação do access token falhou (refresh token
// revogado/expirado/reuso detectado). Sem isto o usuário ficava "logado mas
// quebrado": a sessão NextAuth segue viva e navegável, mas toda chamada à API
// responde 401.
export function SessionGuard() {
  const { data: session } = useSession();
  const error = (session as unknown as { error?: string })?.error;

  useEffect(() => {
    if (error === "RefreshTokenError") {
      signOut({ callbackUrl: "/login" });
    }
  }, [error]);

  return null;
}
