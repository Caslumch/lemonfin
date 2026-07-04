import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
  categoryId?: string;
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

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  colorBg?: string | null;
  colorText?: string | null;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/categories"),
  });
}

export interface CreateTransactionInput {
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  description?: string;
}

// Cria uma transação e invalida os caches que dependem dela — o novo lançamento
// aparece na hora na Home/Extrato/Cartões (mesmo comportamento do web).
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      api<Transaction>("/transactions", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });
}

function useTransactionInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["summary"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["cards"] });
  };
}

export function useUpdateTransaction() {
  const invalidate = useTransactionInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Partial<CreateTransactionInput>;
    }) =>
      api<Transaction>(`/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useTransactionInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/transactions/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

// --- Dashboard (paridade com o web) -----------------------------------------

export interface MonthlyBreakdown {
  month: string; // 'YYYY-MM'
  income: number;
  expense: number;
  cardExpense: number;
  balance: number;
}

export function useMonthly(months = 6) {
  return useQuery({
    queryKey: ["monthly", months],
    queryFn: () => api<MonthlyBreakdown[]>(`/transactions/monthly?months=${months}`),
  });
}

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
  estimatedVariableExpense: number;
  avgDailyVariableExpense: number;
  daysRemaining: number;
  pending: PendingRecurrence[];
}

export function useForecast() {
  return useQuery({
    queryKey: ["forecast"],
    queryFn: () => api<Forecast>("/transactions/forecast"),
  });
}

export interface BudgetStatus {
  month: string;
  amount: number | null;
  spent: number;
  remaining: number;
  percentage: number;
  daysRemaining: number;
  exceeded: boolean;
  projectedSpend: number;
  pace: "under" | "on_track" | "over";
}

export function useBudget() {
  return useQuery({
    queryKey: ["budget"],
    queryFn: () => api<BudgetStatus>("/budgets"),
  });
}

export interface Goal {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  category: { name: string; slug: string; icon: string | null; colorBg: string; colorText: string };
  progress: { spent: number; limit: number; percentage: number; remaining: number; exceeded: boolean };
}

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: () => api<Goal[]>("/goals"),
  });
}

export interface SpendingAlert {
  categoryId: string;
  category: { name: string; slug: string; icon: string | null; colorText: string } | null;
  percentOfPrevious: number;
}

export interface InsightsData {
  alerts: SpendingAlert[];
}

export function useInsights() {
  return useQuery({
    queryKey: ["insights"],
    queryFn: () => api<InsightsData>("/transactions/insights"),
  });
}
