// Camada de autenticação: persistência do JWT no SecureStore + chamadas aos
// endpoints /auth da API NestJS. O contrato bate com sign-in.use-case.ts:
//   sucesso        → { status: 'SUCCESS', user, token }
//   2FA habilitado → { status: 'TOTP_REQUIRED', tempToken }
import * as SecureStore from "expo-secure-store";
import { api } from "./api";

const TOKEN_KEY = "lemonfin.token";
const USER_KEY = "lemonfin.user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

type SignInResponse =
  | { status: "SUCCESS"; user: AuthUser; token: string }
  | { status: "TOTP_REQUIRED"; tempToken: string };

interface SignUpResponse {
  user: AuthUser;
  token: string;
}

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
): Promise<{ user: AuthUser; token: string }> {
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
}): Promise<SignUpResponse> {
  return api<SignUpResponse>("/auth/sign-up", {
    method: "POST",
    token: null,
    body: JSON.stringify(input),
  });
}

// --- Persistência segura -----------------------------------------------------

export async function persistSession(
  token: string,
  user: AuthUser,
): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function loadSession(): Promise<{
  token: string;
  user: AuthUser;
} | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const rawUser = await SecureStore.getItemAsync(USER_KEY);
  if (!token || !rawUser) return null;
  try {
    return { token, user: JSON.parse(rawUser) as AuthUser };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
