import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { api } from "./api";

// Token do device efetivamente registrado no backend (para dar baixa no logout).
const TOKEN_KEY = "lemonfin.push-token";
// Preferência local de opt-out: se o usuário desliga em Configurações, não
// registramos de novo no próximo login.
const PREF_KEY = "lemonfin.push-enabled";

// Push exige aparelho físico (simulador/Expo Go web não recebe token).
export function isPushSupported(): boolean {
  return Device.isDevice;
}

export async function getPushPref(): Promise<boolean> {
  // Default LIGADO: registra ao logar até o usuário desligar explicitamente.
  return (await SecureStore.getItemAsync(PREF_KEY)) !== "0";
}

export async function setPushPref(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(PREF_KEY, enabled ? "1" : "0");
}

function resolveProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

// Pede permissão e obtém o Expo push token. Retorna null se não for possível
// (sem device físico, permissão negada, ou projectId ausente antes do eas init).
async function fetchExpoToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return null;

  // Canal Android (obrigatório p/ heads-up notifications no Android 8+).
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Lembretes",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#D4F400",
    });
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    // Sem projectId (antes de `eas init`) não há como emitir o token.
    console.warn("[push] projectId ausente — rode `eas init` para habilitar.");
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (e) {
    console.warn("[push] falha ao obter token:", (e as Error).message);
    return null;
  }
}

// Fluxo completo pós-login: respeita a preferência, obtém o token e registra no
// backend. Guarda o token para dar baixa no logout. Idempotente (upsert no server).
export async function registerDevice(): Promise<void> {
  if (!(await getPushPref())) return;
  const token = await fetchExpoToken();
  if (!token) return;
  try {
    await api("/devices", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (e) {
    console.warn("[push] falha ao registrar device:", (e as Error).message);
  }
}

// Baixa o token no backend (logout ou opt-out). Precisa rodar ANTES de limpar a
// sessão — o DELETE /devices exige auth.
export async function unregisterDevice(): Promise<void> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return;
  try {
    await api("/devices", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    });
  } catch {
    // best-effort: mesmo se falhar, limpamos o token local.
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// Estado da permissão do SO (para refletir no toggle das Configurações).
export async function getNotificationStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}
