/**
 * Convenção de DATA de transação do LemonFin: toda transação grava `date`
 * ancorada ao MEIO-DIA UTC (a hora real do lançamento mora em `createdAt`).
 * Formatar a data no fuso do Brasil (UTC-3) com meia-noite UTC voltaria 1 dia;
 * o meio-dia é a âncora que sobrevive ao round-trip de fuso. Ver memória
 * transaction-date-noon-utc.
 */

/**
 * "Hoje" ancorado ao meio-dia UTC do dia CIVIL de Brasília (UTC-3).
 *
 * NÃO use `new Date()` cru como data de transação: o instante atual em UTC, para
 * uma compra feita à noite no Brasil (ex.: 23h BR = 02h UTC do dia seguinte),
 * cairia no dia errado na exibição (que formata em UTC). Convertendo primeiro
 * para o dia civil de Brasília e então ancorando ao meio-dia UTC, a data exibida
 * bate com o dia em que o usuário fez a compra.
 */
export function todayNoonUtcBR(now: Date = new Date()): Date {
  const br = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate(), 12, 0, 0),
  );
}
