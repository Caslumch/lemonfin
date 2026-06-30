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

  // Clampa um dia ao último dia válido do mês-alvo. Sem isso, Date.UTC com um dia
  // que excede o mês "vaza" para o mês seguinte (ex.: closingDay=31, fatura de
  // fevereiro → 31/jan a 02/mar, com compras de 01-02/mar caindo na fatura
  // errada). Mesma proteção que nextDueDate e buildInstallmentSchedule já têm.
  const clampDay = (y: number, m: number, day: number): number => {
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return Math.min(day, lastDay);
  };

  // Fim = (closingDay - 1) do mês de referência (clampado a esse mês), 23:59:59.
  const endDay = clampDay(year, monthIndex, closingDay - 1);
  const end = new Date(Date.UTC(year, monthIndex, endDay, 23, 59, 59, 999));

  // Início = o instante seguinte ao FIM do ciclo anterior. Derivar o start assim
  // (em vez de "closingDay do mês anterior") garante ciclos contíguos e
  // DISJUNTOS mesmo quando o clamp de fim de mês colide: com closingDay=30/31, o
  // fim de fevereiro e o fim de janeiro clampam ambos para o último dia, e um
  // "start = closingDay do mês anterior" sobreporia 1 dia (compra contada em 2
  // faturas). O fim do ciclo anterior é o fim do mês anterior (referência -1).
  const prevEndDay = clampDay(year, monthIndex - 1, closingDay - 1);
  const prevEnd = new Date(
    Date.UTC(year, monthIndex - 1, prevEndDay, 23, 59, 59, 999),
  );
  const start = new Date(prevEnd.getTime() + 1);

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

/**
 * Próxima data de vencimento (dueDay) a partir do fechamento da fatura. A fatura
 * fecha em `closeDate` (o `end` do ciclo); o vencimento é a primeira ocorrência
 * do dueDay em ou após o dia seguinte ao fechamento. Ancorada ao meio-dia UTC
 * para exibição (timeZone UTC) não deslocar o dia. Tudo lido/montado em UTC.
 */
export function nextDueDate(dueDay: number, closeDate: Date): Date {
  const year = closeDate.getUTCFullYear();
  // Se o dueDay deste mês já passou (<= dia do fechamento), vai pro mês seguinte.
  // Date.UTC normaliza o overflow de mês (12 → jan do ano seguinte).
  const month =
    dueDay <= closeDate.getUTCDate()
      ? closeDate.getUTCMonth() + 1
      : closeDate.getUTCMonth();
  // Clampa ao último dia do mês (ex.: dueDay 31 em fevereiro).
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(dueDay, lastDay);
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

export type InvoiceCycleState =
  | 'future' // ciclo ainda não começou (hoje < start)
  | 'open' // ciclo em andamento (start <= hoje <= end), nada pago
  | 'closed' // ciclo fechado (hoje > end), não pago
  | 'partial' // pago em parte (independe de estar aberto/fechado)
  | 'paid'; // quitado (ou nada a pagar)

/**
 * Estado de CICLO da fatura, combinando o tempo (futura/aberta/fechada via
 * start/end vs agora) com o pagamento (parcial/paga via invoicePaymentStatus).
 * O pagamento tem prioridade: uma fatura paga é 'paid' mesmo se o ciclo segue
 * aberto, e 'partial' idem. Sem pagamento, o estado vem do tempo do ciclo.
 *
 * Usado pela tela de fatura para o badge e para liberar "Pagar fatura" só quando
 * a fatura fechou (estado 'closed' ou 'partial').
 */
export function invoiceCycleState(params: {
  total: number;
  paid: number;
  start: Date;
  end: Date;
  now: Date;
}): InvoiceCycleState {
  const { total, paid, start, end, now } = params;

  const payment = invoicePaymentStatus(total, paid);
  if (payment === 'paid') return 'paid';
  if (payment === 'partial') return 'partial';

  // Sem pagamento: o estado é dado pela posição de hoje no ciclo.
  if (now < start) return 'future';
  if (now > end) return 'closed';
  return 'open';
}
