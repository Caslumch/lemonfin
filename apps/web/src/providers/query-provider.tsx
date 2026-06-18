"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Um QueryClient por árvore React (criado no client, nunca compartilhado
  // entre requests no servidor).
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Dado é considerado "fresco" por 30s: navegar entre telas e voltar
            // dentro dessa janela mostra o cache na hora, sem refetch.
            staleTime: 30_000,
            // Revalida ao voltar o foco pra aba (ex: usuário lançou gasto no
            // WhatsApp e volta pro navegador → atualiza).
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
