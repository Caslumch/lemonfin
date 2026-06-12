"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MailCheck, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LemonLogo } from "@/components/ui/lemon-logo";
import { useApi } from "@/hooks/use-api";

interface Profile {
  email: string;
  emailVerifiedAt: string | null;
}

export default function ConfirmEmailPage() {
  const router = useRouter();
  const { status } = useSession();
  const { fetchApi } = useApi();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Carrega o e-mail do perfil. Se já estiver verificado, volta ao app.
  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    fetchApi<Profile>("/users/me")
      .then((p) => {
        if (!active) return;
        if (p.emailVerifiedAt) {
          router.replace("/");
          return;
        }
        setEmail(p.email);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [status, fetchApi, router]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setError("");
    setLoading(true);
    try {
      await fetchApi("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      toast.success("E-mail confirmado com sucesso! 🍋");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Código inválido ou expirado."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email || resending) return;
    setError("");
    setResending(true);
    try {
      await fetchApi("/auth/send-email-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      toast.success("Enviamos um novo código para o seu e-mail.");
    } catch {
      toast.error("Não foi possível reenviar o código.");
    } finally {
      setResending(false);
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
            Confirme seu e-mail para concluir
          </p>
        </div>

        <div className="flex justify-center mb-5">
          <div className="w-11 h-11 rounded-full bg-lima/15 flex items-center justify-center">
            <MailCheck size={20} className="text-lima" />
          </div>
        </div>

        {email && (
          <p className="text-center text-xs text-fg-muted mb-4">
            Enviamos um código de 6 dígitos para
            <br />
            <span className="font-medium text-fg">{email}</span>
          </p>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            id="code"
            label="Código de verificação"
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

          {error && <p className="text-sm text-danger text-center">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Confirmar e-mail"
            )}
          </Button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="w-full text-center text-xs text-fg-muted hover:text-fg transition-colors disabled:opacity-50"
          >
            {resending ? "Reenviando..." : "Não recebeu? Reenviar código"}
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={14} />
          Confirmar depois
        </Link>
      </div>
    </div>
  );
}
