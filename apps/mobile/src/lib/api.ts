// Cliente HTTP do app mobile. Espelha apps/web/src/lib/api.ts: mesma API
// NestJS, mesmo contrato. Diferenças: o token vem do token-store (SecureStore)
// em vez do NextAuth, e o 401 dispara o logout via callback (não há window).
import { getToken, triggerUnauthorized } from "./token-store";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface FetchOptions extends RequestInit {
  // Permite sobrescrever o token (ex.: fluxo de login antes de persistir).
  token?: string | null;
}

export async function api<T = unknown>(
  path: string,
  { token, headers, ...options }: FetchOptions = {},
): Promise<T> {
  const authToken = token !== undefined ? token : getToken();

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { message?: string });

    // 401 = token da API expirado/inválido → logout limpo (leva ao login).
    if (res.status === 401) {
      triggerUnauthorized();
    }
    // 402 = paywall do backend. No iOS o app é "reader-mode": NÃO abrimos
    // fluxo de compra aqui (evita o gatilho de IAP da Apple). Apenas
    // propagamos o erro; a UI exibe estado "assinatura inativa" neutro.
    throw new ApiError(res.status, body.message || `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
