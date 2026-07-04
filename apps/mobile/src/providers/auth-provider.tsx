import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AuthUser,
  clearSession,
  loadSession,
  persistSession,
  signInRequest,
  signUpRequest,
  verifyTotpRequest,
} from "@/lib/auth";
import { setOnUnauthorized, setToken } from "@/lib/token-store";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const queryClient = useQueryClient();

  const applySession = useCallback((token: string, nextUser: AuthUser) => {
    setToken(token);
    setUser(nextUser);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  // Hidrata a sessão do SecureStore no boot e liga o handler de 401.
  useEffect(() => {
    setOnUnauthorized(() => {
      void signOut();
    });
    loadSession()
      .then((session) => {
        if (session) applySession(session.token, session.user);
        else setStatus("unauthenticated");
      })
      .catch(() => setStatus("unauthenticated"));
    return () => setOnUnauthorized(null);
  }, [applySession, signOut]);

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (email, password) => {
      try {
        const res = await signInRequest(email, password);
        if (res.status === "TOTP_REQUIRED") {
          return { ok: false, totp: { tempToken: res.tempToken } };
        }
        await persistSession(res.token, res.user);
        applySession(res.token, res.user);
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
        await persistSession(res.token, res.user);
        applySession(res.token, res.user);
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
        await persistSession(res.token, res.user);
        applySession(res.token, res.user);
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
