import type { Category } from "./transaction";

export interface RecurringCard {
  id: string;
  name: string;
}

export interface Recurring {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  dayOfMonth: number;
  active: boolean;
  userId: string;
  categoryId: string;
  category: Category;
  cardId: string | null;
  card: RecurringCard | null;
  createdAt: string;
  updatedAt: string;
}
