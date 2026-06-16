import * as Sentry from "@sentry/nextjs";

// Carrega a config do Sentry conforme o runtime do servidor (Node vs Edge).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Captura erros lançados no servidor (Server Components, route handlers, etc.).
export const onRequestError = Sentry.captureRequestError;
