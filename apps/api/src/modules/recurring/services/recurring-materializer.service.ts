import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RecurringRepository } from '../repositories/recurring.repository';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import {
  resolveRecurringDate,
  resolveRecurringDay,
  type BusinessDayAdjustment,
} from '../../../common/utils/business-day';

@Injectable()
export class RecurringMaterializerService {
  private readonly logger = new Logger(RecurringMaterializerService.name);

  constructor(
    private readonly recurringRepository: RecurringRepository,
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  // Run daily at 06:00 — turn due recurrences into real transactions.
  @Cron('0 6 * * *')
  async materializeDueRecurrences(now: Date = new Date()) {
    // Tudo em UTC para casar com a gravação noon-UTC das transações e a régua de
    // ciclo (que opera em UTC). Ler com getUTC* deixa a intenção explícita e à
    // prova de mudança de TZ do servidor (o resto do app segue a mesma
    // convenção — ver create-installments / card-cycle).
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const today = now.getUTCDate();

    // O dia efetivo de cada recorrência é DERIVADO: o dayOfMonth é clampado ao
    // fim do mês e, conforme o ajuste de dia útil (EXACT/PREVIOUS/NEXT), pode ser
    // deslocado para o dia útil vizinho. Por isso não dá para filtrar por
    // dayOfMonth no banco — trazemos todas as ativas e calculamos o alvo do mês.
    const recurrences = await this.recurringRepository.findAllActive();

    let created = 0;
    for (const recurring of recurrences) {
      try {
        const adjustment =
          recurring.businessDayAdjustment as BusinessDayAdjustment;
        const dueDay = resolveRecurringDay(
          year,
          month,
          recurring.dayOfMonth,
          adjustment,
        );

        // Só materializa no dia efetivo (após clamp + ajuste de dia útil).
        if (dueDay !== today) continue;

        // Data derivada do dia efetivo (noon-UTC). O clique manual usa hoje.
        const date = resolveRecurringDate(
          year,
          month,
          recurring.dayOfMonth,
          adjustment,
        );

        const result = await this.materializeOne(recurring, date);
        if (result.created) created++;
      } catch (error) {
        this.logger.error(
          `Failed to materialize recurring ${recurring.id}: ${error}`,
        );
      }
    }

    if (created > 0) {
      this.logger.log(`Materialized ${created} recurring transaction(s)`);
    }
  }

  /**
   * Materializa UMA recorrência como transação, com a data dada (ISO ou Date).
   * Idempotente por mês civil (UTC): se já existe transação desta recorrência no
   * mês da data, NÃO cria de novo e retorna { created: false }. Usado tanto pelo
   * cron (data = dia efetivo derivado) quanto pelo "Lançar agora" (data = hoje).
   */
  async materializeOne(
    recurring: {
      id: string;
      amount: { toNumber(): number };
      type: 'INCOME' | 'EXPENSE';
      description: string;
      userId: string;
      categoryId: string;
      cardId: string | null;
    },
    date: Date,
  ): Promise<{ created: boolean }> {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    // Idempotência: pula se já materializou no mês da data.
    const already = await this.recurringRepository.hasMaterializedBetween(
      recurring.id,
      monthStart,
      monthEnd,
    );
    if (already) return { created: false };

    await this.transactionsRepository.create({
      amount: recurring.amount.toNumber(),
      type: recurring.type,
      description: recurring.description,
      date: date.toISOString(),
      source: 'RECURRING',
      userId: recurring.userId,
      categoryId: recurring.categoryId,
      cardId: recurring.cardId ?? undefined,
      recurringId: recurring.id,
    });
    return { created: true };
  }
}
