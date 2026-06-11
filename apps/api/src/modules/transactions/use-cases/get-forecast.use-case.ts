import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { RecurringRepository } from '../../recurring/repositories/recurring.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

export interface PendingRecurrence {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  dayOfMonth: number;
  category: { name: string; slug: string; icon: string | null } | null;
}

export interface ForecastResult {
  currentBalance: number; // saldo realizado do mês até agora
  projectedBalance: number; // saldo previsto ao fim do mês
  pendingIncome: number; // receitas recorrentes que ainda vão cair
  pendingExpense: number; // despesas recorrentes que ainda vão cair
  daysRemaining: number;
  pending: PendingRecurrence[]; // detalhe das recorrências pendentes
}

@Injectable()
export class GetForecastUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly recurringRepository: RecurringRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(userId: string, now: Date = new Date()): Promise<ForecastResult> {
    const userIds = await this.familyContext.resolveUserIds(userId);

    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

    const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Saldo realizado do mês até agora.
    const summary = await this.transactionsRepository.getSummary(
      userIds,
      monthStart.toISOString(),
      now.toISOString(),
    );

    const recurrences = await this.recurringRepository.findMany(userIds, true);

    const pending: PendingRecurrence[] = [];
    let pendingIncome = 0;
    let pendingExpense = 0;

    for (const rec of recurrences) {
      // Dia efetivo neste mês: recorrências com dayOfMonth além do último dia
      // do mês caem no último dia (mesma regra do materializador).
      const effectiveDay = Math.min(rec.dayOfMonth, lastDayOfMonth);

      // Só conta o que ainda vai cair (hoje inclusive não conta — já passou o
      // momento da materialização das 6h; consideramos pendente a partir de amanhã).
      if (effectiveDay <= today) continue;

      // Se já foi materializada neste mês (lançada manualmente ou por cron antes
      // da data), não contar de novo.
      const already = await this.recurringRepository.hasMaterializedBetween(
        rec.id,
        monthStart,
        monthEnd,
      );
      if (already) continue;

      const amount = rec.amount.toNumber();
      if (rec.type === 'INCOME') pendingIncome += amount;
      else pendingExpense += amount;

      pending.push({
        id: rec.id,
        description: rec.description,
        amount,
        type: rec.type,
        dayOfMonth: rec.dayOfMonth,
        category: rec.category
          ? {
              name: rec.category.name,
              slug: rec.category.slug,
              icon: rec.category.icon,
            }
          : null,
      });
    }

    pending.sort((a, b) => a.dayOfMonth - b.dayOfMonth);

    const projectedBalance =
      summary.balance + pendingIncome - pendingExpense;

    return {
      currentBalance: summary.balance,
      projectedBalance,
      pendingIncome,
      pendingExpense,
      daysRemaining: lastDayOfMonth - today,
      pending,
    };
  }
}
