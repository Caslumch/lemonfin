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
  // Gasto do ciclo de fatura aberto (presente em GET /cards). Base da barra de
  // uso do limite. Ausente em respostas que não o calculam.
  currentSpend?: number;
}

export interface CardInvoice {
  card: Card;
  month: string;
  transactions: Transaction[];
  total: number;
  isClosed: boolean;
}
