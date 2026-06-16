"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Captura erros de renderização não tratados do App Router e envia ao Sentry.
// (no-op sem DSN). Renderiza um fallback mínimo.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            fontFamily: "system-ui, sans-serif",
            color: "#1a1d16",
            background: "#f6f7f4",
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Algo deu errado</h1>
          <p style={{ fontSize: 14, color: "#5b6150" }}>
            Tivemos um problema inesperado. Tente recarregar a página.
          </p>
        </div>
      </body>
    </html>
  );
}
