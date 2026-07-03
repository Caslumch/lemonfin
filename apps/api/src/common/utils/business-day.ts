import Holidays from 'date-holidays';

export type BusinessDayAdjustment = 'EXACT' | 'PREVIOUS' | 'NEXT';

// Uma única instância de feriados nacionais do Brasil, reaproveitada entre
// chamadas (o construtor carrega tabelas e não é barato). Só feriados PÚBLICOS
// nacionais — nada de estaduais/municipais, que variam por cidade e não fazem
// sentido como régua global de dia útil.
let holidaysInstance: Holidays | null = null;

function getHolidays(): Holidays {
  if (!holidaysInstance) {
    holidaysInstance = new Holidays('BR', { types: ['public'] });
  }
  return holidaysInstance;
}

// Dia útil = não é sábado, não é domingo e não é feriado nacional. Trabalhamos
// sempre em UTC para casar com a convenção noon-UTC do resto do app (ver
// transaction-date-noon-utc): uma data ancorada ao meio-dia UTC representa o
// dia civil brasileiro sem risco de deslocar por fuso.
function isBusinessDay(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;

  // isHoliday retorna um array de feriados (ou false). Como a instância já é
  // filtrada por 'public', qualquer retorno não-vazio significa feriado nacional.
  const result = getHolidays().isHoliday(date);
  return !(Array.isArray(result) && result.length > 0);
}

// Número de dias do mês (month é 0-based, como em Date).
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Resolve o dia civil em que uma recorrência deve ser lançada num mês, aplicando
 * o ajuste de dia útil.
 *
 * - Clampa dayOfMonth ao último dia do mês (dayOfMonth=31 em fevereiro vira 28/29).
 * - EXACT: retorna o dia (já clampado), sem considerar fim de semana/feriado.
 * - PREVIOUS: se o dia não for útil, recua até o dia útil anterior.
 * - NEXT: se o dia não for útil, avança até o dia útil seguinte.
 *
 * PREVIOUS/NEXT nunca saem do mês: se o deslocamento cruzaria a borda do mês, a
 * busca inverte de sentido a partir do dia clampado, garantindo um resultado
 * dentro de [1, últimoDia]. (Um mês sempre tem pelo menos um dia útil.)
 *
 * @returns o dia civil (1..últimoDia) já ajustado.
 */
export function resolveRecurringDay(
  year: number,
  month: number,
  dayOfMonth: number,
  adjustment: BusinessDayAdjustment,
): number {
  const lastDay = lastDayOfMonth(year, month);
  const clamped = Math.min(Math.max(dayOfMonth, 1), lastDay);

  if (adjustment === 'EXACT') return clamped;

  const step = adjustment === 'PREVIOUS' ? -1 : 1;

  // Anda na direção pedida enquanto estiver dentro do mês. Se estourar a borda,
  // inverte o sentido a partir do dia clampado (mantém o resultado no mesmo mês).
  let day = clamped;
  let dir = step;
  while (day >= 1 && day <= lastDay) {
    if (isBusinessDay(year, month, day)) return day;
    const next = day + dir;
    if (next < 1 || next > lastDay) {
      // Bateu na borda: reinicia do dia clampado indo para o outro lado.
      dir = -dir;
      day = clamped + dir;
    } else {
      day = next;
    }
  }

  // Fallback teórico (mês sem dia útil não existe): devolve o dia clampado.
  return clamped;
}

/**
 * Como resolveRecurringDay, mas devolve a Date já ancorada ao meio-dia UTC,
 * pronta para gravar como data da transação materializada.
 */
export function resolveRecurringDate(
  year: number,
  month: number,
  dayOfMonth: number,
  adjustment: BusinessDayAdjustment,
): Date {
  const day = resolveRecurringDay(year, month, dayOfMonth, adjustment);
  return new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
}
