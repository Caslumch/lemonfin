import { cardCycleRange, invoicePaymentStatus } from './card-cycle';

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
