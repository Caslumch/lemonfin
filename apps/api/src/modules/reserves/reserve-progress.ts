// Progresso de uma reserva — função pura, reutilizada pelo use-case de listagem
// (API/web) e pelos handlers do WhatsApp, para garantir que os dois calculem a
// mesma coisa.
export interface ReserveProgress {
  remaining: number; // quanto ainda falta para o alvo (>= 0)
  percentage: number; // 0..999 (clampeado), arredondado
  monthsRemaining: number; // meses inteiros até o prazo (mínimo 1)
  suggestedMonthly: number; // quanto guardar por mês para chegar no prazo
}

export function computeReserveProgress(
  target: number,
  saved: number,
  deadline: Date,
  now: Date = new Date(),
): ReserveProgress {
  const remaining = Math.max(target - saved, 0);
  const percentage =
    target > 0 ? Math.min(Math.round((saved / target) * 100), 999) : 0;

  // Meses inteiros entre agora e o prazo. Mínimo 1 para não dividir por zero
  // (prazo neste mês ou já vencido → "este mês").
  const monthsRemaining = Math.max(
    (deadline.getFullYear() - now.getFullYear()) * 12 +
      (deadline.getMonth() - now.getMonth()),
    1,
  );

  const suggestedMonthly = Math.ceil(remaining / monthsRemaining);

  return { remaining, percentage, monthsRemaining, suggestedMonthly };
}
