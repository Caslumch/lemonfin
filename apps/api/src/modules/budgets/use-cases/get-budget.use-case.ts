import { Injectable } from '@nestjs/common';
import { BudgetsRepository } from '../repositories/budgets.repository';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

export interface BudgetStatus {
  month: string; // 'YYYY-MM'
  amount: number | null; // teto definido (null se não há orçamento)
  spent: number; // gasto do mês (despesas + fatura de cartão)
  remaining: number; // teto - gasto (pode ser negativo)
  percentage: number; // % do teto consumido
  daysRemaining: number; // dias restantes no mês
  exceeded: boolean; // estourou o teto
  // Ritmo: projeção linear pelo gasto médio diário até agora.
  projectedSpend: number; // gasto projetado para o mês inteiro
  pace: 'under' | 'on_track' | 'over'; // dentro / no limite / acima do previsto
}

@Injectable()
export class GetBudgetUseCase {
  constructor(
    private readonly budgetsRepository: BudgetsRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(
    userId: string,
    month?: string,
    now: Date = new Date(),
  ): Promise<BudgetStatus> {
    const userIds = await this.familyContext.resolveUserIds(userId);

    // Mês alvo: parâmetro ou mês atual.
    const targetMonth =
      month ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = Number(yearStr);
    const monthIdx = Number(monthStr) - 1;

    const monthStart = new Date(year, monthIdx, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
    const lastDay = monthEnd.getDate();

    const budget = await this.budgetsRepository.findByMonth(
      userIds,
      targetMonth,
    );

    // Gasto até agora (ou até o fim do mês, se for mês passado).
    const upTo = now < monthEnd ? now : monthEnd;
    const summary = await this.transactionsRepository.getSummary(
      userIds,
      monthStart.toISOString(),
      upTo.toISOString(),
    );
    const spent = summary.expense;

    const amount = budget ? budget.amount.toNumber() : null;

    // Dias decorridos e restantes (do mês alvo, relativo a hoje).
    const today = now.getDate();
    const inThisMonth =
      now.getFullYear() === year && now.getMonth() === monthIdx;
    const daysElapsed = inThisMonth ? today : lastDay;
    const daysRemaining = inThisMonth ? lastDay - today : 0;

    // Projeção linear pelo ritmo de gasto.
    const projectedSpend =
      daysElapsed > 0 ? (spent / daysElapsed) * lastDay : spent;

    let pace: BudgetStatus['pace'] = 'on_track';
    let percentage = 0;
    let exceeded = false;
    let remaining = 0;

    if (amount !== null && amount > 0) {
      percentage = Math.round((spent / amount) * 100);
      remaining = amount - spent;
      exceeded = spent > amount;
      if (projectedSpend > amount * 1.02) pace = 'over';
      else if (projectedSpend < amount * 0.95) pace = 'under';
      else pace = 'on_track';
    }

    return {
      month: targetMonth,
      amount,
      spent,
      remaining,
      percentage,
      daysRemaining,
      exceeded,
      projectedSpend: Math.round(projectedSpend * 100) / 100,
      pace,
    };
  }
}
