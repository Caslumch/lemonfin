// Token store em memória (fonte única para o api client), desacoplado do
// SecureStore e do React para evitar dependência circular entre api.ts e
// auth-provider. O provider hidrata/atualiza este valor; o api.ts só lê.

let currentToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function getToken(): string | null {
  return currentToken;
}

export function setToken(token: string | null): void {
  currentToken = token;
}

// Registrado pelo AuthProvider: chamado quando a API responde 401 (token
// expirado/inválido) para deslogar de forma limpa.
export function setOnUnauthorized(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

export function triggerUnauthorized(): void {
  onUnauthorized?.();
}
