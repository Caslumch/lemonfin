import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AuthUser,
  clearSession,
  loadSession,
  logoutRequest,
  persistSession,
  persistTokens,
  refreshRequest,
  signInRequest,
  signUpRequest,
  verifyTotpRequest,
} from "@/lib/auth";
import {
  runSignOutHook,
  setOnRefresh,
  setOnUnauthorized,
  setToken,
} from "@/lib/token-store";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type SignInResult =
  | { ok: true }
  | { ok: false; totp: { tempToken: string } }
  | { ok: false; error: string };

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  verifyTotp: (tempToken: string, code: string) => Promise<boolean>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type Session = { token: string; refreshToken: string; user: AuthUser };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const queryClient = useQueryClient();
  // Refresh token fora do state (o api client o consome fora do React).
  const refreshTokenRef = useRef<string | null>(null);

  const applySession = useCallback((session: Session) => {
    setToken(session.token);
    refreshTokenRef.current = session.refreshToken;
    setUser(session.user);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    // Baixa do device de push ANTES de limpar o token (o DELETE /devices exige
    // auth). Best-effort — não bloqueia o logout se falhar.
    await runSignOutHook();
    const rt = refreshTokenRef.current;
    if (rt) void logoutRequest(rt).catch(() => {}); // revoga no servidor, best-effort
    refreshTokenRef.current = null;
    await clearSession();
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  // Renova o access com o refresh token (chamado pelo api client no 401).
  const doRefresh = useCallback(async (): Promise<boolean> => {
    const rt = refreshTokenRef.current;
    if (!rt) return false;
    try {
      const next = await refreshRequest(rt);
      refreshTokenRef.current = next.refreshToken;
      setToken(next.token);
      await persistTokens(next.token, next.refreshToken);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Hidrata a sessão do SecureStore no boot e liga os handlers de refresh/401.
  useEffect(() => {
    setOnUnauthorized(() => {
      void signOut();
    });
    setOnRefresh(doRefresh);
    loadSession()
      .then((session) => {
        if (session) applySession(session);
        else setStatus("unauthenticated");
      })
      .catch(() => setStatus("unauthenticated"));
    return () => {
      setOnUnauthorized(null);
      setOnRefresh(null);
    };
  }, [applySession, signOut, doRefresh]);

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (email, password) => {
      try {
        const res = await signInRequest(email, password);
        if (res.status === "TOTP_REQUIRED") {
          return { ok: false, totp: { tempToken: res.tempToken } };
        }
        const session: Session = {
          token: res.token,
          refreshToken: res.refreshToken,
          user: res.user,
        };
        await persistSession(session);
        applySession(session);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: (err as Error).message };
      }
    },
    [applySession],
  );

  const verifyTotp = useCallback<AuthContextValue["verifyTotp"]>(
    async (tempToken, code) => {
      try {
        const res = await verifyTotpRequest(tempToken, code);
        const session: Session = {
          token: res.token,
          refreshToken: res.refreshToken,
          user: res.user,
        };
        await persistSession(session);
        applySession(session);
        return true;
      } catch {
        return false;
      }
    },
    [applySession],
  );

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (input) => {
      try {
        const res = await signUpRequest(input);
        const session: Session = {
          token: res.token,
          refreshToken: res.refreshToken,
          user: res.user,
        };
        await persistSession(session);
        applySession(session);
        return true;
      } catch {
        return false;
      }
    },
    [applySession],
  );

  const value = useMemo(
    () => ({ status, user, signIn, verifyTotp, signUp, signOut }),
    [status, user, signIn, verifyTotp, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
