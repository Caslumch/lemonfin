"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas nao coincidem");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    setLoading(true);

    const phoneDigits = phone.replace(/\D/g, "");

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/sign-up`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          ...(phoneDigits.length >= 10 && { phone: phoneDigits }),
        }),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      setLoading(false);
      setError(data.message || "Erro ao criar conta");
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Conta criada, mas erro ao entrar. Tente fazer login.");
      return;
    }

    toast.success("Conta criada com sucesso!");
    router.push("/?welcome=1");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-lima rounded-sm flex items-center justify-center">
              <span className="font-[family-name:var(--font-display)] font-bold text-dark text-lg">
                $
              </span>
            </div>
            <span className="font-[family-name:var(--font-display)] text-xl font-extrabold text-fg">
              LemonFin
            </span>
          </div>
          <p className="text-sm text-fg-secondary">
            Crie sua conta para comecar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            label="Nome"
            type="text"
            placeholder="Seu nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            id="email"
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="w-full">
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-fg mb-1.5"
            >
              Telefone
            </label>
            <PhoneInput
              defaultCountry="br"
              value={phone}
              onChange={setPhone}
              inputClassName="!w-full !rounded-md !border-[1.5px] !border-border !bg-surface !px-3.5 !py-2.5 !text-sm !font-[family-name:var(--font-body)] !text-fg placeholder:!text-fg-muted !transition-colors !duration-150 focus:!border-fg focus:!outline-none"
              countrySelectorStyleProps={{
                buttonClassName:
                  "!rounded-l-md !border-[1.5px] !border-border !bg-surface !px-2 !py-2.5 hover:!bg-muted !transition-colors",
              }}
            />
          </div>

          <div className="relative">
            <Input
              id="password"
              label="Senha"
              type={showPassword ? "text" : "password"}
              placeholder="Minimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-fg-muted hover:text-fg transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="relative">
            <Input
              id="confirmPassword"
              label="Confirmar senha"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-[38px] text-fg-muted hover:text-fg transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-danger text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Criando conta...
              </>
            ) : (
              "Criar conta"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-fg-secondary">
          Ja tem conta?{" "}
          <Link
            href="/login"
            className="font-medium text-fg hover:underline"
          >
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
