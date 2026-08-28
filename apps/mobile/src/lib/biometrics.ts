import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const LOCK_KEY = "lemonfin.biometric-lock";

// O aparelho tem biometria cadastrada (Face ID / Touch ID / digital)?
export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

// Nome amigável do método disponível (pra rotular o toggle/botão).
export async function biometricLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return "Face ID";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return "Biometria";
  }
  return "Biometria";
}

export async function isLockEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(LOCK_KEY)) === "1";
}

export async function setLockEnabled(enabled: boolean): Promise<void> {
  if (enabled) await SecureStore.setItemAsync(LOCK_KEY, "1");
  else await SecureStore.deleteItemAsync(LOCK_KEY);
}

// Pede a autenticação biométrica. Retorna true se o usuário passou.
export async function authenticate(reason: string): Promise<boolean> {
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: "Cancelar",
    disableDeviceFallback: false, // permite cair no PIN/senha do aparelho
  });
  return res.success;
}
