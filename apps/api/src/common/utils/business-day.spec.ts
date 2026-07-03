import { resolveRecurringDay, resolveRecurringDate } from './business-day';

// month é 0-based (como em Date). Julho = 6, Setembro = 8, Fevereiro = 1.
describe('resolveRecurringDay', () => {
  describe('EXACT', () => {
    it('devolve o dia cru mesmo caindo em fim de semana', () => {
      // 05/07/2026 é domingo — EXACT ignora e mantém dia 5.
      expect(resolveRecurringDay(2026, 6, 5, 'EXACT')).toBe(5);
    });

    it('clampa dayOfMonth ao último dia do mês', () => {
      // Fevereiro/2026 tem 28 dias; dayOfMonth=31 vira 28.
      expect(resolveRecurringDay(2026, 1, 31, 'EXACT')).toBe(28);
    });
  });

  describe('PREVIOUS (antecipa para o dia útil anterior)', () => {
    it('salário dia 5 num domingo antecipa para a sexta anterior', () => {
      // Caso do usuário: 05/07/2026 (dom) → sexta 03/07.
      expect(resolveRecurringDay(2026, 6, 5, 'PREVIOUS')).toBe(3);
    });

    it('pula feriado nacional (07/09 Independência, segunda) para sexta', () => {
      // 07/09/2026 é segunda E feriado → sexta 04/09.
      expect(resolveRecurringDay(2026, 8, 7, 'PREVIOUS')).toBe(4);
    });

    it('mantém o dia quando já é dia útil', () => {
      // 06/07/2026 é segunda (dia útil).
      expect(resolveRecurringDay(2026, 6, 6, 'PREVIOUS')).toBe(6);
    });
  });

  describe('NEXT (posterga para o dia útil seguinte)', () => {
    it('domingo dia 5 posterga para segunda dia 6', () => {
      expect(resolveRecurringDay(2026, 6, 5, 'NEXT')).toBe(6);
    });

    it('pula feriado nacional (07/09 segunda) para terça 08/09', () => {
      expect(resolveRecurringDay(2026, 8, 7, 'NEXT')).toBe(8);
    });

    it('sábado 15/11 (Proclamação, domingo) — 14 é sábado, 15 domingo → segunda 16', () => {
      // 15/11/2026 é domingo E feriado (Proclamação da República) → segunda 16.
      expect(resolveRecurringDay(2026, 10, 15, 'NEXT')).toBe(16);
    });
  });

  describe('bordas do mês', () => {
    it('PREVIOUS que estouraria o início do mês inverte de sentido', () => {
      // 01/02/2026 é domingo; recuar sairia do mês → busca o próximo útil: seg 02.
      expect(resolveRecurringDay(2026, 1, 1, 'PREVIOUS')).toBe(2);
    });

    it('NEXT no último dia caindo em fim de semana recua para dia útil', () => {
      // 28/02/2026 é sábado (último dia); avançar sairia do mês → sexta 27.
      expect(resolveRecurringDay(2026, 1, 31, 'NEXT')).toBe(27);
    });
  });
});

describe('resolveRecurringDate', () => {
  it('ancora a data ajustada ao meio-dia UTC', () => {
    // dia 5 (dom) com PREVIOUS → 03/07/2026 12:00 UTC.
    const date = resolveRecurringDate(2026, 6, 5, 'PREVIOUS');
    expect(date.toISOString()).toBe('2026-07-03T12:00:00.000Z');
  });
});
