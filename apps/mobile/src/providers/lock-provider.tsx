import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AppState,
  type AppStateStatus,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LemonLogo } from "@/components/ui/lemon-logo";
import { Txt } from "@/components/ui/text";
import { useAuth } from "@/providers/auth-provider";
import { authenticate, isLockEnabled } from "@/lib/biometrics";
import { useTheme } from "@/theme/use-theme";
import { accent } from "@/theme/tokens";

interface LockContextValue {
  // Re-lê a preferência do SecureStore (chamado ao ligar/desligar nas Configurações).
  refreshLockPref: () => Promise<void>;
}

const LockContext = createContext<LockContextValue | null>(null);

// Trava o app por biometria (Face ID/Touch ID) quando habilitado: exige
// autenticação no boot e ao voltar do background. Enquanto travado, cobre todo
// o conteúdo com uma tela de bloqueio.
export function LockProvider({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme();
  const { status } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const refreshLockPref = useCallback(async () => {
    const on = await isLockEnabled();
    setEnabled(on);
    // Ao LIGAR, já pede desbloqueio; ao desligar, libera.
    setLocked(on);
  }, []);

  // Lê a preferência no boot.
  useEffect(() => {
    isLockEnabled().then(setEnabled);
  }, []);

  // Trava quando o usuário está logado + lock ligado (boot inicial).
  useEffect(() => {
    if (status === "authenticated" && enabled) setLocked(true);
  }, [status, enabled]);

  // Ao voltar do background para foreground, re-trava.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appState.current;
      appState.current = next;
      if (enabled && prev.match(/inactive|background/) && next === "active") {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, [enabled]);

  const unlock = useCallback(async () => {
    if (authenticating) return;
    setAuthenticating(true);
    try {
      const ok = await authenticate("Desbloquear o LemonFin");
      if (ok) setLocked(false);
    } finally {
      setAuthenticating(false);
    }
  }, [authenticating]);

  // Dispara o prompt automaticamente ao travar (só quando logado).
  useEffect(() => {
    if (locked && status === "authenticated") void unlock();
  }, [locked, status, unlock]);

  // Só bloqueia conteúdo autenticado; login/registro nunca ficam travados.
  const showLock = locked && status === "authenticated";

  return (
    <LockContext.Provider value={{ refreshLockPref }}>
      {children}
      {showLock && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: palette.bg,
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
            },
          ]}
        >
          <LemonLogo size={64} />
          <Txt variant="body" color={palette.textSecondary}>
            App bloqueado
          </Txt>
          <Pressable
            onPress={unlock}
            disabled={authenticating}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 9999,
              backgroundColor: accent.uva,
              opacity: authenticating ? 0.6 : 1,
            }}
          >
            <Ionicons name="lock-open-outline" size={18} color="#FFFFFF" />
            <Txt variant="bodyMedium" color="#FFFFFF">
              Desbloquear
            </Txt>
          </Pressable>
        </View>
      )}
    </LockContext.Provider>
  );
}

export function useLock(): LockContextValue {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error("useLock deve ser usado dentro de <LockProvider>");
  return ctx;
}
