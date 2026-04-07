"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("E-mail ou senha incorretos");
      return;
    }

    router.push("/");
    router.refresh();
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
            <svg width="32" height="32" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <defs>
                <radialGradient id="logo-g" cx="38%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#CCEB3A"/>
                  <stop offset="50%" stopColor="#B8D900"/>
                  <stop offset="100%" stopColor="#A3C200"/>
                </radialGradient>
              </defs>
              <circle cx="256" cy="256" r="256" fill="url(#logo-g)"/>
            </svg>
            <span className="font-[family-name:var(--font-display)] text-xl font-bold text-fg tracking-tight">
              LemonFin
            </span>
          </div>
          <p className="text-sm text-fg-muted">
            Entre na sua conta para continuar
          </p>
        </div>

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

          <Input
            id="password"
            label="Senha"
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-sm text-danger text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-fg-muted">
          Nao tem conta?{" "}
          <Link
            href="/register"
            className="font-medium text-lima hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
