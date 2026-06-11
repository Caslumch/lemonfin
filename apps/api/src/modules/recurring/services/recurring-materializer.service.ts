import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RecurringRepository } from '../repositories/recurring.repository';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';

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
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

    // A recurrence is due today when its dayOfMonth === today, OR when its
    // dayOfMonth falls beyond this month's length and today is the last day
    // (e.g. dayOfMonth=31 in February materializes on the 28th/29th).
    const dueDays = [today];
    if (today === lastDayOfMonth) {
      for (let d = lastDayOfMonth + 1; d <= 31; d++) dueDays.push(d);
    }

    const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    let created = 0;
    for (const day of dueDays) {
      const recurrences = await this.recurringRepository.findActiveForDay(day);

      for (const recurring of recurrences) {
        try {
          // Idempotency: skip if already materialized this month.
          const already = await this.recurringRepository.hasMaterializedBetween(
            recurring.id,
            monthStart,
            monthEnd,
          );
          if (already) continue;

          const date = new Date(year, month, today, 12, 0, 0, 0);

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
          created++;
        } catch (error) {
          this.logger.error(
            `Failed to materialize recurring ${recurring.id}: ${error}`,
          );
        }
      }
    }

    if (created > 0) {
      this.logger.log(`Materialized ${created} recurring transaction(s)`);
    }
  }
}
