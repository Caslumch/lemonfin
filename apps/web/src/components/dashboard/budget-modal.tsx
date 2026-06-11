"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BudgetModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  currentAmount: number | null;
  monthLabel: string;
}

export function BudgetModal({
  open,
  onClose,
  onSubmit,
  currentAmount,
  monthLabel,
}: BudgetModalProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAmount(currentAmount != null ? String(currentAmount) : "");
    setError("");
  }, [currentAmount, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setError("Informe um valor válido");
      return;
    }
    setLoading(true);
    try {
      await onSubmit(value);
      onClose();
    } catch {
      setError("Erro ao salvar orçamento");
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
              Orçamento de {monthLabel}
            </h2>
            <button
              onClick={onClose}
              className="text-fg-muted hover:text-fg cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-fg-secondary">
              Defina quanto pretende gastar neste mês. Conta despesas e fatura
              de cartão.
            </p>

            <Input
              id="budgetAmount"
              label="Limite do mês"
              type="number"
              step="0.01"
              min="0"
              prefix="R$"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            {error && <p className="text-sm text-danger text-center">{error}</p>}

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
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
