"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Reserve } from "@/types/reserve";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

interface ContributeModalProps {
  reserve: Reserve | null;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
}

// Mini-modal de aporte: guarda um valor numa reserva. Igual ao fluxo do
// WhatsApp, o aporte vira uma despesa na categoria "reservas" — deixamos isso
// explícito no texto para o usuário entender que sai do saldo do mês.
export function ContributeModal({
  reserve,
  onClose,
  onSubmit,
}: ContributeModalProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAmount("");
    setError("");
  }, [reserve]);

  if (!reserve) return null;

  const remaining = reserve.progress.remaining;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Informe um valor maior que zero");
      return;
    }
    setLoading(true);
    try {
      await onSubmit(value);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar");
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
              Guardar em {reserve.name}
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
              id="amount"
              label="Quanto guardar"
              type="number"
              step="0.01"
              min="0"
              prefix="R$"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />

            {remaining > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(remaining.toFixed(2)))}
                className="text-xs font-medium text-uva hover:text-uva-hover transition-colors cursor-pointer"
              >
                Completar a reserva ({formatBRL(remaining)})
              </button>
            )}

            <p className="text-xs text-fg-muted">
              O valor é lançado como despesa na categoria{" "}
              <strong>reservas</strong> — sai do seu saldo do mês.
            </p>

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
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
