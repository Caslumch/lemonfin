import { signOut } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function api<T = unknown>(
  path: string,
  { token, headers, ...options }: FetchOptions = {},
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
    // 401 = token da API expirado/inválido. Antes o app ficava "logado mas
    // quebrado" (sessão NextAuth ainda válida, mas toda request 401). Deslogamos
    // de forma limpa: leva ao login com ?expired=1 para exibir um aviso. Só no
    // cliente (no SSR/route handler não há window nem signOut) e fora das
    // próprias telas de auth, para não entrar em loop de redirect.
    if (res.status === 401 && typeof window !== "undefined") {
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
    throw new Error(body.message || `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
