"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteGoalModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  goalName?: string;
}

export function DeleteGoalModal({
  open,
  onClose,
  onConfirm,
  goalName,
}: DeleteGoalModalProps) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-surface rounded-lg shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
              Excluir meta
            </h2>
            <button
              onClick={onClose}
              className="text-fg-muted hover:text-fg cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            <p className="text-sm text-fg-secondary mb-6">
              Tem certeza que deseja excluir a meta{" "}
              <strong className="text-fg">{goalName}</strong>? Esta acao nao
              pode ser desfeita.
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
