import type { Category } from "./transaction";

export interface RecurringCard {
  id: string;
  name: string;
}

// Ajuste de dia útil quando o dia cai em fim de semana ou feriado nacional.
// EXACT = dia exato; PREVIOUS = antecipa p/ útil anterior; NEXT = posterga.
export type BusinessDayAdjustment = "EXACT" | "PREVIOUS" | "NEXT";

export interface Recurring {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  dayOfMonth: number;
  businessDayAdjustment: BusinessDayAdjustment;
  active: boolean;
  userId: string;
  categoryId: string;
  category: Category;
  cardId: string | null;
  card: RecurringCard | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringListResponse {
  data: Recurring[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    // Somas mensais de todas as recorrentes ATIVAS (não só a página atual).
    monthlyExpense: number;
    monthlyIncome: number;
  };
}
