"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { LemonLogo } from "@/components/ui/lemon-logo";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Dois passos: pedir o email (recebe o OTP) e redefinir (OTP + nova senha).
type Step = "REQUEST" | "RESET";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("REQUEST");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // A resposta é sempre genérica (anti-enumeração). Avançamos para o passo
      // do código independentemente de a conta existir.
      await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      toast.success("Se existir uma conta, enviamos um código para o e-mail.");
      setStep("RESET");
    } catch {
      setError("Não foi possível enviar o código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message || "Código inválido ou expirado."
        );
        return;
      }

      toast.success("Senha redefinida! Faça login com a nova senha.");
      router.push("/login");
    } catch {
      setError("Não foi possível redefinir a senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-lima/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-lima/3 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm backdrop-blur-xl bg-surface/60 dark:bg-surface/40 border border-border dark:border-white/[0.06] rounded-2xl p-8 shadow-xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <LemonLogo size={32} className="shrink-0" />
            <span className="font-[family-name:var(--font-display)] text-xl font-bold text-fg tracking-tight">
              LemonFin
            </span>
          </div>
          <p className="text-sm text-fg-muted">
            {step === "REQUEST"
              ? "Recupere o acesso à sua conta"
              : "Digite o código e crie uma nova senha"}
          </p>
        </div>

        <div className="flex justify-center mb-5">
          <div className="w-11 h-11 rounded-full bg-lima/15 flex items-center justify-center">
            <KeyRound size={20} className="text-lima" />
          </div>
        </div>

        {step === "REQUEST" ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <Input
              id="email"
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />

            {error && <p className="text-sm text-danger text-center">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Enviar código"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <Input
              id="code"
              label="Código de 6 dígitos"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="tracking-[0.3em] text-center font-[family-name:var(--font-mono)]"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              autoFocus
              required
            />

            <PasswordInput
              id="newPassword"
              label="Nova senha"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <PasswordInput
              id="confirmPassword"
              label="Confirmar nova senha"
              placeholder="Repita a senha"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {error && <p className="text-sm text-danger text-center">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Redefinir senha"
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("REQUEST");
                setError("");
              }}
              className="w-full text-center text-xs text-fg-muted hover:text-fg transition-colors"
            >
              Não recebeu? Reenviar código
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
