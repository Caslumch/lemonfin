import { cardCycleRange } from './card-cycle';

describe('cardCycleRange', () => {
  // A régua é baseada no MÊS de referência, não no dia. A fatura "de junho" é
  // sempre [closingDay do mês anterior, closingDay-1 do mês], independente do dia.
  it('fatura de junho com closingDay=25 → 25/mai a 24/jun', () => {
    const { start, end } = cardCycleRange(25, new Date(2026, 5, 1)); // junho
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(4); // maio
    expect(start.getDate()).toBe(25);
    expect(end.getMonth()).toBe(5); // junho
    expect(end.getDate()).toBe(24);
    expect(end.getHours()).toBe(23);
  });

  it('é estável dentro do mês: dia 1 e dia 25 dão o MESMO ciclo', () => {
    const cedo = cardCycleRange(25, new Date(2026, 5, 1));
    const tarde = cardCycleRange(25, new Date(2026, 5, 25)); // dia do fechamento
    expect(cedo.start.getTime()).toBe(tarde.start.getTime());
    expect(cedo.end.getTime()).toBe(tarde.end.getTime());
  });

  it('virada de ano: fatura de janeiro pega dezembro do ano anterior', () => {
    const { start, end } = cardCycleRange(10, new Date(2026, 0, 1)); // jan/2026
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(11); // dezembro
    expect(start.getDate()).toBe(10);
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(0); // janeiro
    expect(end.getDate()).toBe(9);
  });

  it('closingDay=1 → ciclo = mês civil cheio do mês anterior', () => {
    const { start, end } = cardCycleRange(1, new Date(2026, 5, 1)); // junho
    expect(start.getMonth()).toBe(4); // 1/mai
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(4); // 31/mai (dia anterior ao 1/jun)
    expect(end.getDate()).toBe(31);
  });
});
