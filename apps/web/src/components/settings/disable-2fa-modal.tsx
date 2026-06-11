"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { useApi } from "@/hooks/use-api";

interface Disable2FAModalProps {
  open: boolean;
  onClose: () => void;
  onDisabled: () => void;
}

export function Disable2FAModal({
  open,
  onClose,
  onDisabled,
}: Disable2FAModalProps) {
  const { fetchApi } = useApi();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      await fetchApi("/users/me/2fa", {
        method: "DELETE",
        body: JSON.stringify({ password }),
      });
      toast.success("2FA desativado");
      setPassword("");
      onDisabled();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desativar 2FA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-surface rounded-[24px] shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
              Desativar 2FA
            </h2>
            <button
              onClick={onClose}
              className="text-fg-muted hover:text-fg cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleConfirm} className="p-6 space-y-4">
            <p className="text-sm text-fg-secondary">
              Confirme sua senha para desativar a autenticação de dois fatores.
            </p>

            <PasswordInput
              id="disable2faPassword"
              label="Senha"
              placeholder="Sua senha"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="danger"
                className="flex-1"
                disabled={loading || !password}
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Desativar"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
