"use client";

import { useState } from "react";
import { X, Copy, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";

interface TwoFactorSetupModalProps {
  open: boolean;
  secret: string;
  qrCodeDataUrl: string;
  onClose: () => void;
  onEnabled: () => void;
}

export function TwoFactorSetupModal({
  open,
  secret,
  qrCodeDataUrl,
  onClose,
  onEnabled,
}: TwoFactorSetupModalProps) {
  const { fetchApi } = useApi();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  if (!open) return null;

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const res = await fetchApi<{ success: boolean; backupCodes: string[] }>(
        "/users/me/2fa/enable",
        {
          method: "POST",
          body: JSON.stringify({ secret, code }),
        }
      );
      setBackupCodes(res.backupCodes);
    } catch {
      toast.error("Código inválido");
    } finally {
      setLoading(false);
    }
  }

  function copyBackupCodes() {
    if (!backupCodes) return;
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast.success("Códigos copiados!");
  }

  function handleFinish() {
    setCode("");
    setBackupCodes(null);
    onEnabled();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface rounded-[24px] shadow-xl">
          {backupCodes ? (
            <>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className="text-lima" />
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
                    2FA ativado!
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-fg-secondary">
                  Guarde estes códigos em local seguro — eles permitem acesso se
                  você perder o celular. Cada código pode ser usado uma única
                  vez.
                </p>

                <div className="grid grid-cols-2 gap-2 rounded-[12px] border border-border bg-muted p-4">
                  {backupCodes.map((bc) => (
                    <code
                      key={bc}
                      className="font-[family-name:var(--font-mono)] text-sm text-fg text-center tracking-widest"
                    >
                      {bc}
                    </code>
                  ))}
                </div>

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={copyBackupCodes}
                  >
                    <Copy size={14} className="mr-2" />
                    Copiar códigos
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleFinish}
                  >
                    Concluir
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
                  Ativar 2FA
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
                  Escaneie o QR code abaixo com o Google Authenticator (ou app
                  similar).
                </p>

                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeDataUrl}
                    alt="QR code para 2FA"
                    className="w-44 h-44 rounded-[12px] border border-border bg-white p-2"
                  />
                </div>

                <div>
                  <p className="text-xs text-fg-muted mb-1.5 text-center">
                    Ou digite esta chave manualmente:
                  </p>
                  <code className="block rounded-[12px] border border-border bg-muted px-4 py-2.5 font-[family-name:var(--font-mono)] text-xs text-fg tracking-widest text-center break-all">
                    {secret}
                  </code>
                </div>

                <Input
                  id="totpCode"
                  label="Código do app"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="tracking-[0.4em] text-center font-[family-name:var(--font-mono)]"
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
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
                    className="flex-1"
                    disabled={loading || code.length !== 6}
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Confirmar"
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
