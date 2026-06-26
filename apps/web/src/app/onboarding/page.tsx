"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, Trash2, Check, ArrowRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { logApiError } from "@/lib/log-error";
import type { Category } from "@/types/transaction";

interface FixedExpense {
  description: string;
  amount: string;
  dayOfMonth: string;
  categorySlug: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { status } = useSession();
  const { fetchApi } = useApi();

  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Passo 1 — renda
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDay, setIncomeDay] = useState("5");

  // Passo 2 — contas fixas
  const [expenses, setExpenses] = useState<FixedExpense[]>([
    { description: "", amount: "", dayOfMonth: "10", categorySlug: "moradia" },
  ]);

  // Passo 3 — orçamento
  const [budget, setBudget] = useState("");

  // Se já fez onboarding, pula direto pro dashboard.
  const checkOnboarded = useCallback(async () => {
    try {
      const me = await fetchApi<{ onboardedAt: string | null }>("/users/me");
      if (me.onboardedAt) {
        router.replace("/");
        return;
      }
    } catch (error) {
      logApiError("onboarding:check", error);
    } finally {
      setChecking(false);
    }
  }, [fetchApi, router]);

  useEffect(() => {
    if (status === "authenticated") {
      checkOnboarded();
      fetchApi<Category[]>("/categories")
        .then(setCategories)
        .catch((e) => logApiError("onboarding:categories", e));
    } else if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, checkOnboarded, fetchApi, router]);

  function addExpense() {
    setExpenses((e) => [
      ...e,
      { description: "", amount: "", dayOfMonth: "10", categorySlug: "outros" },
    ]);
  }

  function updateExpense(i: number, patch: Partial<FixedExpense>) {
    setExpenses((e) => e.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function removeExpense(i: number) {
    setExpenses((e) => e.filter((_, idx) => idx !== i));
  }

  async function finish() {
    setSaving(true);
    try {
      const fixedExpenses = expenses
        .filter((e) => e.description.trim() && parseFloat(e.amount) > 0)
        .map((e) => ({
          description: e.description.trim(),
          amount: parseFloat(e.amount),
          dayOfMonth: parseInt(e.dayOfMonth, 10),
          categorySlug: e.categorySlug,
        }));

      const payload: Record<string, unknown> = { fixedExpenses };
      if (parseFloat(incomeAmount) > 0) {
        payload.income = {
          amount: parseFloat(incomeAmount),
          dayOfMonth: parseInt(incomeDay, 10),
        };
      }
      if (parseFloat(budget) > 0) {
        payload.budgetAmount = parseFloat(budget);
      }

      await fetchApi("/users/me/onboarding", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Tudo pronto! Bem-vindo ao LemonFin 🍋");
      router.replace("/");
    } catch (error) {
      logApiError("onboarding:finish", error);
      toast.error("Erro ao salvar. Tente novamente.");
      setSaving(false);
    }
  }

  async function skip() {
    setSaving(true);
    try {
      await fetchApi("/users/me/onboarding", {
        method: "POST",
        body: JSON.stringify({ fixedExpenses: [] }),
      });
    } catch (error) {
      logApiError("onboarding:skip", error);
    } finally {
      router.replace("/");
    }
  }

  if (checking || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-shell">
        <p className="text-white/60 text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-shell flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-page rounded-[28px] shadow-xl overflow-hidden">
        {/* Header com progresso */}
        <div className="bg-surface-accent px-7 py-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-full bg-lima flex items-center justify-center">
              <Wallet size={18} className="text-dark" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold text-on-dark">
              Vamos configurar seu LemonFin
            </span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-lima" : "bg-white/15"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-7">
          {/* PASSO 1 — Renda */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in-up">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-fg">
                  Qual sua renda mensal?
                </h2>
                <p className="text-sm text-fg-secondary mt-1">
                  Vou lançar como receita fixa todo mês. Pode pular se preferir.
                </p>
              </div>
              <Input
                id="income"
                label="Renda mensal"
                type="number"
                prefix="R$"
                placeholder="0,00"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
              />
              <Input
                id="incomeDay"
                label="Dia que recebe"
                type="number"
                min="1"
                max="31"
                value={incomeDay}
                onChange={(e) => setIncomeDay(e.target.value)}
              />
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={skip} disabled={saving}>
                  Pular tudo
                </Button>
                <Button className="flex-1 gap-1.5" onClick={() => setStep(2)}>
                  Continuar <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* PASSO 2 — Contas fixas */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in-up">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-fg">
                  Suas contas fixas
                </h2>
                <p className="text-sm text-fg-secondary mt-1">
                  Aluguel, internet, assinaturas... lanço automaticamente todo
                  mês.
                </p>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {expenses.map((exp, i) => (
                  <div
                    key={i}
                    className="rounded-[16px] border border-border bg-surface p-3 space-y-2"
                  >
                    <div className="flex gap-2">
                      <input
                        placeholder="Descrição (ex: Aluguel)"
                        value={exp.description}
                        onChange={(e) =>
                          updateExpense(i, { description: e.target.value })
                        }
                        className="flex-1 rounded-[12px] border-[1.5px] border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-fg focus:outline-none"
                      />
                      <button
                        onClick={() => removeExpense(i)}
                        className="p-2 rounded-[12px] text-fg-muted hover:text-danger hover:bg-danger-muted transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="R$ 0,00"
                        value={exp.amount}
                        onChange={(e) =>
                          updateExpense(i, { amount: e.target.value })
                        }
                        className="w-24 rounded-[12px] border-[1.5px] border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-fg focus:outline-none"
                      />
                      <input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="Dia"
                        value={exp.dayOfMonth}
                        onChange={(e) =>
                          updateExpense(i, { dayOfMonth: e.target.value })
                        }
                        className="w-16 rounded-[12px] border-[1.5px] border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-fg focus:outline-none"
                      />
                      <Select
                        value={exp.categorySlug}
                        onChange={(v) =>
                          updateExpense(i, { categorySlug: v })
                        }
                        size="md"
                        className="flex-1"
                        options={categories
                          .filter((c) => c.slug !== "salario")
                          .map((c) => ({
                            value: c.slug,
                            label: `${c.icon} ${c.name}`,
                          }))}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addExpense}
                className="flex items-center gap-1.5 text-sm text-fg-secondary hover:text-fg transition-colors cursor-pointer"
              >
                <Plus size={16} /> Adicionar conta
              </button>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button className="flex-1 gap-1.5" onClick={() => setStep(3)}>
                  Continuar <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* PASSO 3 — Orçamento */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in-up">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-fg">
                  Seu orçamento do mês
                </h2>
                <p className="text-sm text-fg-secondary mt-1">
                  Quanto pretende gastar neste mês? Vou te avisar se passar.
                </p>
              </div>
              <Input
                id="budget"
                label="Limite do mês"
                type="number"
                prefix="R$"
                placeholder="0,00"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Voltar
                </Button>
                <Button
                  className="flex-1 gap-1.5"
                  onClick={finish}
                  disabled={saving}
                >
                  {saving ? (
                    "Salvando..."
                  ) : (
                    <>
                      <Check size={16} /> Concluir
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
