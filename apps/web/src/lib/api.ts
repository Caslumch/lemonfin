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
