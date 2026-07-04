import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Tipos derivados do contrato da API (GetSummaryUseCase / ListTransactionsUseCase).
// TODO(#05): migrar estes shapes para @lemonfin/shared e reusar no web também.
export interface Summary {
  income: number;
  expense: number;
  balance: number;
  cardExpense?: number;
  cardInvoice?: number;
}

export interface TransactionCategory {
  name: string;
  icon?: string | null;
  colorBg?: string | null;
  colorText?: string | null;
}

export interface Transaction {
  id: string;
  amount: string | number;
  type: "INCOME" | "EXPENSE";
  description?: string | null;
  date: string;
  category?: TransactionCategory | null;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

export function useSummary() {
  return useQuery({
    queryKey: ["summary"],
    queryFn: () => api<Summary>("/transactions/summary"),
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions", { page: 1 }],
    queryFn: () =>
      api<Paginated<Transaction>>("/transactions?page=1&perPage=25"),
  });
}

export interface Card {
  id: string;
  name: string;
  brand?: string | null;
  limit?: string | number | null;
  closingDay: number;
  dueDay?: number | null;
  colorPreset?: string | null;
}

export function useCards() {
  return useQuery({
    queryKey: ["cards"],
    queryFn: () => api<Card[]>("/cards"),
  });
}
