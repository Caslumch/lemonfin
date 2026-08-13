"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteCardModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  cardName?: string;
}

export function DeleteCardModal({
  open,
  onClose,
  onConfirm,
  cardName,
}: DeleteCardModalProps) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-surface rounded-[24px] shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
              Remover cartão
            </h2>
            <button
              onClick={onClose}
              className="text-fg-muted hover:text-fg cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6">
            <p className="text-sm text-fg-secondary">
              Tem certeza que deseja remover
              {cardName ? (
                <> o cartão <strong>&ldquo;{cardName}&rdquo;</strong></>
              ) : (
                " este cartão"
              )}
              ? As transações vinculadas não serão removidas.
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
                className="flex-1 gap-1.5"
                disabled={loading}
                onClick={handleConfirm}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Removendo
                  </>
                ) : (
                  "Remover"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
