import type { Category } from "./transaction";

export interface GoalProgress {
  spent: number;
  limit: number;
  percentage: number;
  remaining: number;
  exceeded: boolean;
  periodStart: string;
  periodEnd: string;
}

export interface Goal {
  id: string;
  name: string;
  amount: number;
  period: "MONTHLY" | "WEEKLY";
  active: boolean;
  userId: string;
  categoryId: string;
  category: Category;
  progress: GoalProgress;
  createdAt: string;
  updatedAt: string;
}
