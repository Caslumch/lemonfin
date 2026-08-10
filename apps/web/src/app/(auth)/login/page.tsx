"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { armWelcomeSplash } from "@/components/layout/welcome-splash-gate";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { LemonLogo } from "@/components/ui/lemon-logo";

interface SignInUser {
  id: string;
  name: string;
  email: string;
}

interface SignInSuccess {
  status: "SUCCESS";
  user: SignInUser;
  token: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
}

interface TotpRequired {
  status: "TOTP_REQUIRED";
  tempToken: string;
}

type SignInResponse = SignInSuccess | TotpRequired;

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Aviso quando o usuário caiu aqui por sessão expirada (api.ts manda
  // ?expired=1 ao receber 401). Lido no client para evitar Suspense de
  // useSearchParams. Some se ele começar a digitar (o erro de login assume).
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired") === "1") setExpired(true);
  }, []);

  // 2FA step state
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);

  /**
   * Establish the NextAuth session from an already-obtained access token,
   * bypassing the API re-auth (and thus the 2FA prompt) via directToken mode.
   */
  async function establishSession(user: SignInUser, data: SignInSuccess) {
    const result = await signIn("credentials", {
      directToken: data.token,
      // Sessão de longa duração: o NextAuth renova o access (15min) com este
      // refresh token; sem ele a sessão morreria em 15 minutos.
      refreshToken: data.refreshToken ?? "",
      tokenExpiresAt: data.tokenExpiresAt ?? "",
      userId: user.id,
      name: user.name,
      email: user.email,
      redirect: false,
    });

    if (result?.error) {
      setError("Erro ao iniciar a sessão. Tente novamente.");
      return false;
    }

    // Só aqui: a splash é recompensa de login, não de toda abertura do app.
    armWelcomeSplash();
    router.push("/");
    router.refresh();
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/sign-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setError("E-mail ou senha incorretos");
        return;
      }

      const data: SignInResponse = await res.json();

      if (data.status === "TOTP_REQUIRED") {
        setTempToken(data.tempToken);
        setCode("");
        setUseBackup(false);
        return;
      }

      await establishSession(data.user, data);
    } catch {
      setError("Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify2fa(e: React.FormEvent) {
    e.preventDefault();
    if (!tempToken) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code }),
      });

      if (!res.ok) {
        setError("Código inválido");
        return;
      }

      const data: SignInSuccess = await res.json();
      if (data.status !== "SUCCESS" || !data.token) {
        setError("Código inválido");
        return;
      }

      await establishSession(data.user, data);
    } catch {
      setError("Não foi possível verificar o código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function backToLogin() {
    setTempToken(null);
    setCode("");
    setError("");
    setUseBackup(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-lima/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-lima/3 blur-[100px] pointer-events-none" />

      {/* Glass card */}
      <div className="w-full max-w-sm backdrop-blur-xl bg-surface/60 dark:bg-surface/40 border border-border dark:border-white/[0.06] rounded-2xl p-8 shadow-xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <LemonLogo size={32} className="shrink-0" />
            <span className="font-[family-name:var(--font-display)] text-xl font-bold text-fg tracking-tight">
              LemonFin
            </span>
          </div>
          <p className="text-sm text-fg-muted">
            {tempToken
              ? "Confirme o código de verificação"
              : "Entre na sua conta para continuar"}
          </p>
        </div>

        {expired && !tempToken && (
          <div className="mb-5 rounded-xl border border-border bg-subtle/60 px-4 py-3 text-sm text-fg-secondary text-center">
            Sua sessão expirou. Entre de novo para continuar. 🔒
          </div>
        )}

        {tempToken ? (
          <form onSubmit={handleVerify2fa} className="space-y-4">
            <div className="flex justify-center">
              <div className="w-11 h-11 rounded-full bg-lima/15 flex items-center justify-center">
                <ShieldCheck size={20} className="text-lima" />
              </div>
            </div>

            <Input
              id="totp"
              label={useBackup ? "Código de backup" : "Código do autenticador"}
              inputMode={useBackup ? "text" : "numeric"}
              autoComplete="one-time-code"
              placeholder={useBackup ? "XXXX-XXXX" : "000000"}
              className="tracking-[0.3em] text-center font-[family-name:var(--font-mono)]"
              value={code}
              onChange={(e) =>
                setCode(
                  useBackup
                    ? e.target.value.toUpperCase().slice(0, 9)
                    : e.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              autoFocus
              required
            />

            {error && (
              <p className="text-sm text-danger text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Verificar"
              )}
            </Button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setUseBackup((v) => !v);
                  setCode("");
                  setError("");
                }}
                className="text-fg-muted hover:text-fg transition-colors"
              >
                {useBackup
                  ? "Usar código do app"
                  : "Usar código de backup"}
              </button>
              <button
                type="button"
                onClick={backToLogin}
                className="text-fg-muted hover:text-fg transition-colors"
              >
                Voltar
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <PasswordInput
              id="password"
              label="Senha"
              placeholder="Sua senha"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex justify-end -mt-1">
              <Link
                href="/esqueci-senha"
                className="text-xs text-fg-muted hover:text-fg transition-colors"
              >
                Esqueci minha senha
              </Link>
            </div>

            {error && (
              <p className="text-sm text-danger text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        )}

        {!tempToken && (
          <p className="mt-6 text-center text-sm text-fg-muted">
            Não tem conta?{" "}
            <Link
              href="/register"
              className="font-medium text-lima hover:underline"
            >
              Criar conta
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
