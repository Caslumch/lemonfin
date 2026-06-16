"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import * as Sentry from "@sentry/nextjs";

/**
 * Anexa o usuário logado ao escopo do Sentry (id + email) para correlacionar
 * erros do front. No-op sem DSN. Montado uma vez no layout do dashboard.
 */
export function SentryUser() {
  const { data: session } = useSession();

  useEffect(() => {
    const user = session?.user as
      | { id?: string; email?: string | null }
      | undefined;
    if (user?.id) {
      Sentry.setUser({ id: user.id, email: user.email ?? undefined });
    } else {
      Sentry.setUser(null);
    }
  }, [session]);

  return null;
}
