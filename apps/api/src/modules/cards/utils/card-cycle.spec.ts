import {
  cardCycleRange,
  invoicePaymentStatus,
  invoiceCycleState,
  nextDueDate,
} from './card-cycle';

describe('invoicePaymentStatus', () => {
  it('nada pago → open', () => {
    expect(invoicePaymentStatus(6338.27, 0)).toBe('open');
  });
  it('pago parcial → partial', () => {
    expect(invoicePaymentStatus(6338.27, 3000)).toBe('partial');
  });
  it('pago total → paid', () => {
    expect(invoicePaymentStatus(6338.27, 6338.27)).toBe('paid');
  });
  it('pago acima do total → paid', () => {
    expect(invoicePaymentStatus(6338.27, 7000)).toBe('paid');
  });
  it('tolera arredondamento de centavo → paid', () => {
    expect(invoicePaymentStatus(100, 99.999)).toBe('paid');
  });
  it('fatura sem compras (total 0) → paid (nada a pagar)', () => {
    expect(invoicePaymentStatus(0, 0)).toBe('paid');
  });
});

describe('cardCycleRange', () => {
  // A régua é construída em UTC (casa com a gravação noon-UTC das transações),
  // então lemos as bordas com getUTC* — independem do fuso do servidor.
  const ref = (y: number, m: number) => new Date(Date.UTC(y, m, 1));

  // A régua é baseada no MÊS de referência, não no dia. A fatura "de junho" é
  // sempre [closingDay do mês anterior, closingDay-1 do mês], independente do dia.
  it('fatura de junho com closingDay=25 → 25/mai a 24/jun', () => {
    const { start, end } = cardCycleRange(25, ref(2026, 5)); // junho
    expect(start.getUTCFullYear()).toBe(2026);
    expect(start.getUTCMonth()).toBe(4); // maio
    expect(start.getUTCDate()).toBe(25);
    expect(end.getUTCMonth()).toBe(5); // junho
    expect(end.getUTCDate()).toBe(24);
    expect(end.getUTCHours()).toBe(23);
  });

  it('é estável dentro do mês: dia 1 e dia 25 dão o MESMO ciclo', () => {
    const cedo = cardCycleRange(25, ref(2026, 5));
    const tarde = cardCycleRange(25, new Date(Date.UTC(2026, 5, 25)));
    expect(cedo.start.getTime()).toBe(tarde.start.getTime());
    expect(cedo.end.getTime()).toBe(tarde.end.getTime());
  });

  it('virada de ano: fatura de janeiro pega dezembro do ano anterior', () => {
    const { start, end } = cardCycleRange(10, ref(2026, 0)); // jan/2026
    expect(start.getUTCFullYear()).toBe(2025);
    expect(start.getUTCMonth()).toBe(11); // dezembro
    expect(start.getUTCDate()).toBe(10);
    expect(end.getUTCFullYear()).toBe(2026);
    expect(end.getUTCMonth()).toBe(0); // janeiro
    expect(end.getUTCDate()).toBe(9);
  });

  it('closingDay=1 → ciclo = mês civil cheio do mês anterior', () => {
    const { start, end } = cardCycleRange(1, ref(2026, 5)); // junho
    expect(start.getUTCMonth()).toBe(4); // 1/mai
    expect(start.getUTCDate()).toBe(1);
    expect(end.getUTCMonth()).toBe(4); // 31/mai (dia anterior ao 1/jun)
    expect(end.getUTCDate()).toBe(31);
  });

  // As bordas são UTC absolutas: uma compra gravada ao meio-dia UTC no primeiro
  // e no último dia do ciclo cai dentro; o dia do fechamento (corte) fica fora.
  it('bordas em UTC: compra noon-UTC no 1º e no último dia entram; dia do corte fica fora', () => {
    const { start, end } = cardCycleRange(25, ref(2026, 5)); // 25/mai → 24/jun
    const primeiroDia = new Date(Date.UTC(2026, 4, 25, 12, 0, 0)); // 25/mai
    const ultimoDia = new Date(Date.UTC(2026, 5, 24, 12, 0, 0)); // 24/jun
    const diaDoCorte = new Date(Date.UTC(2026, 5, 25, 12, 0, 0)); // 25/jun → próximo ciclo
    expect(primeiroDia >= start && primeiroDia <= end).toBe(true);
    expect(ultimoDia >= start && ultimoDia <= end).toBe(true);
    expect(diaDoCorte <= end).toBe(false);
  });
});

describe('nextDueDate', () => {
  // Fechamento 24/jun (end do ciclo de junho, closingDay 25), dueDay 5.
  const closeJun = new Date(Date.UTC(2026, 5, 24, 23, 59, 59, 999));

  it('dueDay após o fechamento → vence no mês seguinte', () => {
    const due = nextDueDate(5, closeJun); // 5 > 24? não → mês seguinte (julho)
    expect(due.getUTCFullYear()).toBe(2026);
    expect(due.getUTCMonth()).toBe(6); // julho
    expect(due.getUTCDate()).toBe(5);
    expect(due.getUTCHours()).toBe(12); // meio-dia UTC p/ exibição não deslocar
  });

  it('dueDay <= dia do fechamento → vai para o mês seguinte (vencimento futuro)', () => {
    const due = nextDueDate(20, closeJun); // 20 <= 24 → julho
    expect(due.getUTCMonth()).toBe(6); // julho
    expect(due.getUTCDate()).toBe(20);
  });

  it('clampa dueDay ao último dia do mês (31 em fevereiro)', () => {
    const closeJan = new Date(Date.UTC(2026, 0, 31, 23, 59, 59, 999));
    const due = nextDueDate(31, closeJan); // 31 <= 31 → fevereiro, clampa a 28
    expect(due.getUTCMonth()).toBe(1); // fevereiro
    expect(due.getUTCDate()).toBe(28);
  });
});

describe('invoiceCycleState', () => {
  const start = new Date(Date.UTC(2026, 4, 25)); // 25/mai
  const end = new Date(Date.UTC(2026, 5, 24, 23, 59, 59, 999)); // 24/jun
  const base = { total: 6338.27, paid: 0, start, end };

  it('hoje antes do início → future', () => {
    const now = new Date(Date.UTC(2026, 4, 10)); // 10/mai
    expect(invoiceCycleState({ ...base, now })).toBe('future');
  });

  it('hoje dentro do ciclo, nada pago → open', () => {
    const now = new Date(Date.UTC(2026, 5, 10)); // 10/jun
    expect(invoiceCycleState({ ...base, now })).toBe('open');
  });

  it('hoje após o fechamento, nada pago → closed', () => {
    const now = new Date(Date.UTC(2026, 5, 30)); // 30/jun (caso da tela)
    expect(invoiceCycleState({ ...base, now })).toBe('closed');
  });

  it('pagamento parcial tem prioridade sobre o tempo → partial', () => {
    const now = new Date(Date.UTC(2026, 5, 30));
    expect(invoiceCycleState({ ...base, paid: 3000, now })).toBe('partial');
  });

  it('fatura quitada → paid mesmo com ciclo ainda aberto', () => {
    const now = new Date(Date.UTC(2026, 5, 10)); // ciclo aberto
    expect(invoiceCycleState({ ...base, paid: 6338.27, now })).toBe('paid');
  });

  it('ciclo sem compras (total 0) → paid (nada a pagar)', () => {
    const now = new Date(Date.UTC(2026, 5, 30));
    expect(invoiceCycleState({ ...base, total: 0, now })).toBe('paid');
  });
});
