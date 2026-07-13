import { signOut, getSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface FetchOptions extends RequestInit {
  token?: string;
  // Interno: marca a repetição pós-renovação de sessão para não retentar em loop.
  _retried?: boolean;
}

// Erro de request com o status HTTP anexado — permite ao chamador distinguir
// casos como 409 (conflito) de falhas genéricas sem depender do texto.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  { token, headers, _retried, ...options }: FetchOptions = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // 401 = access token da API expirado/inválido. Com aba parada 15+ min o
    // access vence antes de o useSession do componente perceber; deslogar
    // direto era punir sessão renovável. Primeiro força a renovação
    // (getSession → o jwt callback renova via /auth/refresh e grava o cookie
    // novo) e REPETE a request uma vez; só desloga se nem assim resolver.
    if (res.status === 401 && typeof window !== "undefined") {
      if (!_retried) {
        const fresh = await getSession().catch(() => null);
        const freshToken = (fresh as { accessToken?: string } | null)
          ?.accessToken;
        if (freshToken && freshToken !== token) {
          return api<T>(path, {
            ...options,
            headers,
            token: freshToken,
            _retried: true,
          });
        }
      }
      const p = window.location.pathname;
      const onAuthPage =
        p.startsWith("/login") ||
        p.startsWith("/register") ||
        p.startsWith("/esqueci-senha");
      if (!onAuthPage) {
        // signOut limpa o cookie de sessão do NextAuth e redireciona.
        void signOut({ callbackUrl: "/login?expired=1" });
      }
    }
    // 402 = paywall hard do backend: a escrita foi bloqueada por falta de
    // assinatura. Manda o usuário pra tela de assinatura (defesa em profundidade
    // caso o PaywallGuard não tenha redirecionado antes).
    if (res.status === 402 && typeof window !== "undefined") {
      if (!window.location.pathname.startsWith("/assinar")) {
        window.location.assign("/assinar");
      }
    }
    throw new ApiError(res.status, body.message || `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
