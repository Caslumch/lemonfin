import * as Sentry from "@sentry/nextjs";

/**
 * Loga erros de chamadas à API de forma estruturada e envia ao Sentry (no-op
 * sem DSN). Ponto único de observabilidade do front.
 *
 * @param context  rótulo curto do que falhou (ex: "load:dashboard")
 * @param error    o erro capturado
 */
export function logApiError(context: string, error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error ?? "erro desconhecido");
  // eslint-disable-next-line no-console
  console.error(`[api] ${context}: ${message}`, error);
  Sentry.captureException(error, { tags: { context } });
}
