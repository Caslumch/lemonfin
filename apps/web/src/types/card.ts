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

export type InvoicePaymentStatus = "open" | "partial" | "paid";

// Estado de CICLO da fatura (futura/aberta/fechada-a-vencer/parcial/paga).
// Diferente de InvoicePaymentStatus: combina o tempo do ciclo com o pagamento.
export type InvoiceCycleState =
  | "future"
  | "open"
  | "closed"
  | "partial"
  | "paid";

export interface InvoicePayment {
  id: string;
  amount: number;
  paidAt: string;
}

export interface CardInvoice {
  card: Card;
  month: string;
  transactions: Transaction[];
  // Soma do ciclo FILTRADO inteiro (não só a página atual).
  total: number;
  isClosed: boolean;
  // Estado de ciclo (badge) + datas prontas para exibição. closeDate = fim do
  // ciclo; dueDate = vencimento (null se o cartão não tem dueDay). Ambas ISO.
  cycleState: InvoiceCycleState;
  closeDate: string;
  dueDate: string | null;
  // Pagamento da fatura: total já pago no ciclo, status derivado e a lista de
  // pagamentos (para histórico/desfazer).
  paid: number;
  paymentStatus: InvoicePaymentStatus;
  payments: InvoicePayment[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}
