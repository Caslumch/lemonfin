// Token store em memória (fonte única para o api client), desacoplado do
// SecureStore e do React para evitar dependência circular entre api.ts e
// auth-provider. O provider hidrata/atualiza este valor; o api.ts só lê.

let currentToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let refreshHandler: (() => Promise<boolean>) | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let signOutHook: (() => Promise<void>) | null = null;

export function getToken(): string | null {
  return currentToken;
}

export function setToken(token: string | null): void {
  currentToken = token;
}

// Registrado pelo AuthProvider: chamado quando a renovação falha (refresh
// inválido/expirado) para deslogar de forma limpa.
export function setOnUnauthorized(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

export function triggerUnauthorized(): void {
  onUnauthorized?.();
}

// Handler de renovação (usa o refresh token), registrado pelo AuthProvider.
export function setOnRefresh(fn: (() => Promise<boolean>) | null): void {
  refreshHandler = fn;
}

// Renova o access token. Dedupe: várias requests que tomam 401 ao mesmo tempo
// compartilham a MESMA renovação (evita rajada de /auth/refresh).
export function refreshAccessToken(): Promise<boolean> {
  if (!refreshHandler) return Promise.resolve(false);
  if (!refreshInFlight) {
    refreshInFlight = refreshHandler().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// Hook rodado no INÍCIO do signOut, com o token ainda válido (ex.: dar baixa no
// device de push via DELETE /devices). Registrado pelo PushProvider.
export function setOnSignOut(fn: (() => Promise<void>) | null): void {
  signOutHook = fn;
}

export async function runSignOutHook(): Promise<void> {
  if (signOutHook) await signOutHook().catch(() => {});
}
