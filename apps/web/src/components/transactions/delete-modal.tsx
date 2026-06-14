"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DeleteScope = "single" | "group";

interface DeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (scope: DeleteScope) => Promise<void>;
  description?: string | null;
  // Total de parcelas do grupo (> 1 quando a transação é parcelada). Quando
  // definido, o modal oferece "excluir só esta" vs. "excluir todas".
  installmentTotal?: number | null;
}

export function DeleteModal({
  open,
  onClose,
  onConfirm,
  description,
  installmentTotal,
}: DeleteModalProps) {
  // Guarda qual ação está em andamento para mostrar o loading no botão certo.
  const [loadingScope, setLoadingScope] = useState<DeleteScope | null>(null);

  if (!open) return null;

  const isInstallment = !!installmentTotal && installmentTotal > 1;
  const loading = loadingScope !== null;

  async function handleConfirm(scope: DeleteScope) {
    setLoadingScope(scope);
    try {
      await onConfirm(scope);
      onClose();
    } catch {
      // onConfirm já notificou o erro (toast); aqui só evitamos fechar o modal,
      // deixando o usuário tentar de novo. Não re-propaga (sem unhandled rejection).
    } finally {
      setLoadingScope(null);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={loading ? undefined : onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-surface rounded-[24px] shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
              Remover transação
            </h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-fg-muted hover:text-fg cursor-pointer disabled:opacity-50 disabled:cursor-default"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6">
            {isInstallment ? (
              <>
                <p className="text-sm text-fg-secondary">
                  Esta é uma compra parcelada em{" "}
                  <strong>{installmentTotal}x</strong>
                  {description ? (
                    <> (<strong>&quot;{description}&quot;</strong>)</>
                  ) : null}
                  . O que você quer remover? Esta ação não pode ser desfeita.
                </p>
                <div className="flex flex-col gap-3 mt-6">
                  <Button
                    variant="danger"
                    className="w-full"
                    disabled={loading}
                    onClick={() => handleConfirm("group")}
                  >
                    {loadingScope === "group"
                      ? "Removendo..."
                      : `Excluir as ${installmentTotal} parcelas`}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                    onClick={() => handleConfirm("single")}
                  >
                    {loadingScope === "single"
                      ? "Removendo..."
                      : "Excluir só esta parcela"}
                  </Button>
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="text-sm text-fg-muted hover:text-fg cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-fg-secondary">
                  Tem certeza que deseja remover
                  {description ? (
                    <> a transação <strong>&quot;{description}&quot;</strong></>
                  ) : (
                    " esta transação"
                  )}
                  ? Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    disabled={loading}
                    onClick={() => handleConfirm("single")}
                  >
                    {loading ? "Removendo..." : "Remover"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
