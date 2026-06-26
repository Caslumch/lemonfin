/**
 * Fonte ÚNICA de verdade do ciclo de fatura de um cartão de crédito.
 *
 * Convenção estilo Nubank: o DIA do fechamento (`closingDay`) é o corte — uma
 * compra feita NO closingDay já entra na fatura do próximo ciclo. Logo a fatura
 * de um mês de referência vai do `closingDay` do mês ANTERIOR (inclusive) até o
 * dia ANTERIOR ao fechamento deste mês (`closingDay - 1`, 23:59:59.999).
 *
 * A régua é baseada no MÊS de referência (não no dia de hoje): a fatura "de
 * junho" é sempre 25/mai → 24/jun, independente de hoje ser dia 10 ou 25. Isso
 * mantém o número estável e idêntico entre a tela /cartoes, o card de limite
 * usado e o WhatsApp.
 */
export function cardCycleRange(
  closingDay: number,
  ref: Date,
): { start: Date; end: Date } {
  const year = ref.getFullYear();
  const monthIndex = ref.getMonth();
  const start = new Date(year, monthIndex - 1, closingDay);
  const end = new Date(year, monthIndex, closingDay - 1, 23, 59, 59, 999);
  return { start, end };
}
