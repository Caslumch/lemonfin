"use client";

import { useState } from "react";
import { X } from "lucide-react";
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
        <div className="w-full max-w-sm bg-surface rounded-lg shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
              Remover cartao
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
                <> o cartao <strong>"{cardName}"</strong></>
              ) : (
                " este cartao"
              )}
              ? As transacoes vinculadas nao serao removidas.
            </p>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={loading}
                onClick={handleConfirm}
              >
                {loading ? "Removendo..." : "Remover"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
