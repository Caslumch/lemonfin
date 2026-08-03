"use client";

import { Copy, KeyRound, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ApiKeyCreatedModalProps {
  open: boolean;
  // A chave CRUA, mostrada uma única vez (o backend só guarda o hash).
  apiKey: string;
  name: string;
  onClose: () => void;
}

// Exibe a chave recém-criada. É o ÚNICO momento em que o valor completo aparece —
// depois é irrecuperável. Por isso o modal insiste em "copie agora".
export function ApiKeyCreatedModal({
  open,
  apiKey,
  name,
  onClose,
}: ApiKeyCreatedModalProps) {
  if (!open) return null;

  function copyKey() {
    navigator.clipboard.writeText(apiKey);
    toast.success("Chave copiada!");
  }

  return (
    <>
      {/* Sem fechar ao clicar fora: o usuário PRECISA copiar antes de sair. */}
      <div className="fixed inset-0 bg-black/30 z-40" />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface rounded-[24px] shadow-xl">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
            <KeyRound size={20} className="text-lima" />
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
              Chave criada!
            </h2>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-fg-secondary">
              Sua chave <span className="font-medium text-fg">{name}</span> está
              pronta. Copie agora e guarde em local seguro.
            </p>

            <code className="block rounded-[12px] border border-border bg-muted px-4 py-3 font-[family-name:var(--font-mono)] text-xs text-fg break-all">
              {apiKey}
            </code>

            <div className="flex items-start gap-2 rounded-[12px] border border-amber-500/30 bg-amber-500/10 px-3.5 py-3">
              <AlertTriangle
                size={16}
                className="text-amber-500 shrink-0 mt-0.5"
              />
              <p className="text-xs text-fg-secondary">
                Esta é a única vez que a chave completa será exibida. Por
                segurança, não a mostramos de novo — se perder, é só criar outra.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={copyKey}
              >
                <Copy size={14} className="mr-2" />
                Copiar chave
              </Button>
              <Button type="button" className="flex-1" onClick={onClose}>
                Já copiei
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
