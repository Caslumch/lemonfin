export interface ReserveProgress {
  remaining: number;
  percentage: number;
  monthsRemaining: number;
  suggestedMonthly: number;
}

export interface Reserve {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
  active: boolean;
  userId: string;
  progress: ReserveProgress;
  createdAt: string;
  updatedAt: string;
}
