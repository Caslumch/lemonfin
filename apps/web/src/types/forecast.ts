export interface PendingRecurrence {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  dayOfMonth: number;
  category: { name: string; slug: string; icon: string | null } | null;
}

export interface Forecast {
  currentBalance: number;
  projectedBalance: number;
  pendingIncome: number;
  pendingExpense: number;
  daysRemaining: number;
  pending: PendingRecurrence[];
}
