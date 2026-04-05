import type { Transaction } from "./transaction";

export interface Card {
  id: string;
  name: string;
  brand: string | null;
  limit: string | null;
  closingDay: number;
  dueDay: number | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardInvoice {
  card: Card;
  month: string;
  transactions: Transaction[];
  total: number;
  isClosed: boolean;
}
