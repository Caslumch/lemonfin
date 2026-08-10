// Camada de autenticação: persistência do JWT + refresh token no SecureStore +
// chamadas aos endpoints /auth. Contrato (main, refresh tokens):
//   sign-in sucesso → { status: 'SUCCESS', user, token, tokenExpiresAt, refreshToken }
//   2FA habilitado  → { status: 'TOTP_REQUIRED', tempToken }
//   verify-2fa/sign-up → { user, token, tokenExpiresAt, refreshToken }
//   refresh → { token, tokenExpiresAt, refreshToken }  (mesmo refresh, sem rotação)
import * as SecureStore from "expo-secure-store";
import { api } from "./api";

const TOKEN_KEY = "lemonfin.token";
const REFRESH_KEY = "lemonfin.refresh";
const USER_KEY = "lemonfin.user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface SessionTokens {
  token: string;
  refreshToken: string;
  tokenExpiresAt?: string;
}

interface AuthSuccess extends SessionTokens {
  user: AuthUser;
}

type SignInResponse =
  | ({ status: "SUCCESS" } & AuthSuccess)
  | { status: "TOTP_REQUIRED"; tempToken: string };

export async function signInRequest(
  email: string,
  password: string,
): Promise<SignInResponse> {
  return api<SignInResponse>("/auth/sign-in", {
    method: "POST",
    token: null,
    body: JSON.stringify({ email, password }),
  });
}

export async function verifyTotpRequest(
  tempToken: string,
  code: string,
): Promise<AuthSuccess> {
  return api("/auth/verify-2fa", {
    method: "POST",
    token: null,
    body: JSON.stringify({ tempToken, code }),
  });
}

export async function signUpRequest(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<AuthSuccess> {
  return api<AuthSuccess>("/auth/sign-up", {
    method: "POST",
    token: null,
    body: JSON.stringify(input),
  });
}

// Renova o access token com o refresh token. token:null → não entra no laço de
// renovação do api client (um 401 aqui = refresh inválido).
export async function refreshRequest(
  refreshToken: string,
): Promise<SessionTokens> {
  return api<SessionTokens>("/auth/refresh", {
    method: "POST",
    token: null,
    body: JSON.stringify({ refreshToken }),
  });
}

// Revoga a sessão de longa duração no servidor (best-effort no logout).
export async function logoutRequest(refreshToken: string): Promise<void> {
  await api("/auth/logout", {
    method: "POST",
    token: null,
    body: JSON.stringify({ refreshToken }),
  });
}

// --- Persistência segura -----------------------------------------------------

export async function persistSession(session: {
  token: string;
  refreshToken: string;
  user: AuthUser;
}): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, session.token);
  await SecureStore.setItemAsync(REFRESH_KEY, session.refreshToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
}

// Atualiza só os tokens (renovação) — mantém o usuário armazenado.
export async function persistTokens(
  token: string,
  refreshToken: string,
): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function loadSession(): Promise<{
  token: string;
  refreshToken: string;
  user: AuthUser;
} | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  const rawUser = await SecureStore.getItemAsync(USER_KEY);
  if (!token || !refreshToken || !rawUser) return null;
  try {
    return { token, refreshToken, user: JSON.parse(rawUser) as AuthUser };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
