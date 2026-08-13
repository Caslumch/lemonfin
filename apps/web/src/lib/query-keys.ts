import type { QueryClient } from "@tanstack/react-query";

/**
 * Chaves de query centralizadas.
 *
 * Toda tela que usa React Query deve referenciar as chaves daqui (nunca strings
 * soltas), e toda mutação deve invalidar as chaves afetadas via os helpers
 * abaixo. Assim, mexer numa transação em qualquer tela mantém o painel, a lista
 * e o resumo sincronizados.
 */
export const queryKeys = {
  dashboard: ["dashboard"] as const,
  // A lista de transações depende de filtros (página, tipo, categoria, busca,
  // mês). Passamos os filtros para que cada combinação tenha seu próprio cache;
  // invalidar pelo prefixo ["transactions"] atinge todas as combinações.
  transactions: (filters?: object) =>
    filters
      ? (["transactions", filters] as const)
      : (["transactions"] as const),
  transactionsSummary: (filters?: object) =>
    filters
      ? (["transactions-summary", filters] as const)
      : (["transactions-summary"] as const),
  categories: ["categories"] as const,
  // Lista da tela de gerência (inclui categorias do sistema + flag editable),
  // distinta da lista simples usada em selects de outras telas.
  managedCategories: ["managed-categories"] as const,
  cards: ["cards"] as const,
  // A fatura depende do cartão e dos filtros do ciclo (mês, página, ordenação,
  // categoria, parcelamento, busca). Cada combinação tem seu próprio cache, e
  // invalidar pelo prefixo ["invoice"] atinge todas.
  invoice: (cardId?: string, filters?: object) =>
    cardId
      ? (["invoice", cardId, filters ?? null] as const)
      : (["invoice"] as const),
  goals: ["goals"] as const,
  budget: ["budget"] as const,
  reserves: ["reserves"] as const,
  recurring: ["recurring"] as const,
  insights: ["insights"] as const,
  family: ["family"] as const,
};

/**
 * Invalida tudo que é afetado por mudanças em transações.
 *
 * Uma transação muda: a própria lista, o resumo da tela, o painel (saldo,
 * gastos, gráficos, orçamento, previsão) E os insights (comparativos por
 * categoria). Chame isto após criar/editar/excluir transações em QUALQUER tela.
 */
export function invalidateTransactionData(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["transactions"] });
  qc.invalidateQueries({ queryKey: ["transactions-summary"] });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  qc.invalidateQueries({ queryKey: queryKeys.insights });
}

/**
 * Categorias são referenciadas por transações, metas, recorrentes e pelo painel
 * (gráfico por categoria, metas). Ao criar/editar/excluir categoria, invalida
 * todas as duas listas (gerência + select) e quem depende delas.
 */
export function invalidateCategories(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.categories });
  qc.invalidateQueries({ queryKey: queryKeys.managedCategories });
  qc.invalidateQueries({ queryKey: queryKeys.goals });
  qc.invalidateQueries({ queryKey: queryKeys.recurring });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  qc.invalidateQueries({ queryKey: queryKeys.insights });
}

/** Cartões aparecem no painel e são usados em transações/recorrentes. */
export function invalidateCards(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.cards });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
}

/**
 * Pagar/desfazer/conferir mexe no ciclo inteiro da fatura, então invalida pelo
 * prefixo — todas as combinações de mês/filtro em cache. O badge de estado e o
 * total do cartão no painel também mudam.
 */
export function invalidateInvoice(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.invoice() });
  qc.invalidateQueries({ queryKey: queryKeys.cards });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
}

/** Metas aparecem no painel (progresso por categoria). */
export function invalidateGoals(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.goals });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
}

/** Recorrentes alimentam a previsão (forecast) do painel. */
export function invalidateRecurring(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.recurring });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
}

/** Reservas são isoladas (não aparecem em outras telas). */
export function invalidateReserves(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.reserves });
}
