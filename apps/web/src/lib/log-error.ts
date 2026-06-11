/**
 * Loga erros de chamadas à API de forma estruturada, em vez de engoli-los
 * silenciosamente. Ponto único para, no futuro, plugar observabilidade
 * (Sentry, etc).
 *
 * @param context  rótulo curto do que falhou (ex: "load:dashboard")
 * @param error    o erro capturado
 */
export function logApiError(context: string, error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error ?? "erro desconhecido");
  // eslint-disable-next-line no-console
  console.error(`[api] ${context}: ${message}`, error);
}
