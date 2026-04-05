export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  colorBg: string;
  colorText: string;
}

export interface Transaction {
  id: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  description: string | null;
  date: string;
  source: "MANUAL" | "WHATSAPP";
  categoryId: string;
  category: Category;
  cardId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSummary {
  income: number;
  expense: number;
  cardExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
}

export interface MonthlyBreakdown {
  month: string;
  income: number;
  expense: number;
  cardExpense: number;
  balance: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  category: Category;
  total: number;
  count: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export interface CategoryComparison {
  categoryId: string;
  category: Category | null;
  currentTotal: number;
  previousTotal: number;
  variation: number;
  trend: "up" | "down" | "stable";
}

export interface SpendingAlert {
  categoryId: string;
  category: Category | null;
  currentTotal: number;
  previousTotal: number;
  percentOfPrevious: number;
  daysRemaining: number;
}

export interface InsightsData {
  currentMonth: { income: number; expense: number; balance: number };
  previousMonth: { income: number; expense: number; balance: number };
  overallVariation: number;
  alerts: SpendingAlert[];
  categoryComparisons: CategoryComparison[];
  topGrowing: CategoryComparison[];
  topShrinking: CategoryComparison[];
}
