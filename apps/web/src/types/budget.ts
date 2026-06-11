export interface BudgetStatus {
  month: string; // 'YYYY-MM'
  amount: number | null; // teto definido (null se não há orçamento)
  spent: number;
  remaining: number;
  percentage: number;
  daysRemaining: number;
  exceeded: boolean;
  projectedSpend: number;
  pace: "under" | "on_track" | "over";
}
