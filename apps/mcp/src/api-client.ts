// Cliente fino do gateway REST /v1 do LemonFin. O servidor MCP NÃO reimplementa
// regra de negócio — cada tool só chama o endpoint /v1 correspondente com a API
// key do usuário. A base URL vem do env; a key vem por request (header do
// cliente MCP), então é passada a cada chamada.

const BASE_URL = (
  process.env.LEMONFIN_API_URL ?? 'http://localhost:3001'
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClient {
  get(path: string): Promise<unknown>;
  post(path: string, body: unknown): Promise<unknown>;
}

// Cria um cliente atrelado a UMA api key (a do usuário daquela conexão MCP).
export function makeApiClient(apiKey: string): ApiClient {
  async function request(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const data = text ? safeJson(text) : null;

    if (!res.ok) {
      const message =
        (data && typeof data === 'object' && 'message' in data
          ? String((data as { message: unknown }).message)
          : text) || `HTTP ${res.status}`;
      throw new ApiError(res.status, message);
    }
    return data;
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
