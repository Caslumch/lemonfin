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
 *
 * Os limites são construídos em UTC (`Date.UTC`), não em horário local. As
 * transações são gravadas ao meio-dia UTC (ver create-installments / whatsapp),
 * então a régua precisa estar na MESMA referência de fuso — senão o resultado
 * depende do `TZ` do servidor (Render roda em UTC, mas um `TZ=America/Sao_Paulo`
 * deslocaria as bordas em 3h e poderia vazar compras do dia do fechamento para o
 * ciclo errado). O `ref` é lido em UTC para extrair ano/mês de referência.
 */
export function cardCycleRange(
  closingDay: number,
  ref: Date,
): { start: Date; end: Date } {
  const year = ref.getUTCFullYear();
  const monthIndex = ref.getUTCMonth();
  const start = new Date(Date.UTC(year, monthIndex - 1, closingDay));
  const end = new Date(
    Date.UTC(year, monthIndex, closingDay - 1, 23, 59, 59, 999),
  );
  return { start, end };
}

export type InvoicePaymentStatus = 'open' | 'partial' | 'paid';

/**
 * Status de pagamento de uma fatura, derivado do total pago vs o total do ciclo.
 * `open` = nada pago; `partial` = pago < total; `paid` = pago >= total (com uma
 * folga de centavo para arredondamento). Um ciclo com total 0 (sem compras) e
 * nada pago é considerado `paid` (não há o que pagar).
 */
export function invoicePaymentStatus(
  total: number,
  paid: number,
): InvoicePaymentStatus {
  if (total <= 0) return 'paid';
  if (paid <= 0) return 'open';
  if (paid + 0.005 >= total) return 'paid';
  return 'partial';
}
