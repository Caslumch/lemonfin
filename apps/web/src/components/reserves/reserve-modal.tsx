"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Reserve } from "@/types/reserve";

const reserveSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  targetAmount: z.number().positive("Valor deve ser positivo"),
  deadline: z.string().min(1, "Prazo é obrigatório"),
});

interface ReserveModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    targetAmount: number;
    deadline: string;
  }) => Promise<void>;
  reserve?: Reserve | null;
}

// Para o <input type="date">: ISO "YYYY-MM-DD".
function toDateInput(iso: string): string {
  return iso ? iso.slice(0, 10) : "";
}

export function ReserveModal({
  open,
  onClose,
  onSubmit,
  reserve,
}: ReserveModalProps) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = !!reserve;

  useEffect(() => {
    if (reserve) {
      setName(reserve.name);
      setTargetAmount(String(reserve.targetAmount));
      setDeadline(toDateInput(reserve.deadline));
    } else {
      setName("");
      setTargetAmount("");
      setDeadline("");
    }
    setError("");
  }, [reserve, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = reserveSchema.safeParse({
      name,
      targetAmount: parseFloat(targetAmount),
      deadline,
    });

    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await onSubmit(result.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface rounded-[24px] shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
              {isEditing ? "Editar reserva" : "Nova reserva"}
            </h2>
            <button
              onClick={onClose}
              className="text-fg-muted hover:text-fg cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input
              id="name"
              label="Nome da reserva"
              type="text"
              placeholder="Ex: Viagem de férias"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              id="targetAmount"
              label="Quanto quer juntar"
              type="number"
              step="0.01"
              min="0"
              prefix="R$"
              placeholder="0,00"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
            />

            <Input
              id="deadline"
              label="Até quando"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />

            {error && (
              <p className="text-sm text-danger text-center">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading
                  ? "Salvando..."
                  : isEditing
                    ? "Salvar"
                    : "Criar reserva"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
