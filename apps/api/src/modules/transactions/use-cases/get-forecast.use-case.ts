import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { RecurringRepository } from '../../recurring/repositories/recurring.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import {
  resolveRecurringDay,
  type BusinessDayAdjustment,
} from '../../../common/utils/business-day';

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
  estimatedVariableExpense: number; // gasto variável estimado p/ o resto do mês
  avgDailyVariableExpense: number; // média diária de gasto variável (base da estimativa)
  daysRemaining: number;
  pending: PendingRecurrence[]; // detalhe das recorrências pendentes
}

// Meses completos usados para estimar a média de gastos variáveis.
const VARIABLE_HISTORY_MONTHS = 3;

@Injectable()
export class GetForecastUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly recurringRepository: RecurringRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(
    userId: string,
    now: Date = new Date(),
  ): Promise<ForecastResult> {
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
      // Dia efetivo neste mês: clamp ao fim do mês + ajuste de dia útil
      // (EXACT/PREVIOUS/NEXT), a MESMA régua do materializador. Antes usava o dia
      // cru, o que dessincronizava a previsão do que o cron de fato lança.
      const effectiveDay = resolveRecurringDay(
        year,
        month,
        rec.dayOfMonth,
        rec.businessDayAdjustment as BusinessDayAdjustment,
      );

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

    const daysRemaining = lastDayOfMonth - today;

    // Estimativa de gastos variáveis (avulsos) para o resto do mês. Base: média
    // diária de despesas variáveis "em dinheiro" dos últimos meses completos.
    // Cartão fica de fora (não afeta saldo até a fatura) e recorrências também
    // (já estão em pendingExpense), então não há dupla contagem.
    const histStart = new Date(
      year,
      month - VARIABLE_HISTORY_MONTHS,
      1,
      0,
      0,
      0,
      0,
    );
    const histEnd = monthStart; // exclui o mês corrente
    const histVariable =
      await this.transactionsRepository.getVariableExpenseTotal(
        userIds,
        histStart,
        histEnd,
      );
    const histDays = Math.round(
      (histEnd.getTime() - histStart.getTime()) / 86_400_000,
    );

    let avgDailyVariableExpense = histDays > 0 ? histVariable / histDays : 0;

    // Sem histórico (usuário novo): cai para o ritmo do próprio mês até agora.
    if (avgDailyVariableExpense === 0 && today > 0) {
      const variableSoFar =
        await this.transactionsRepository.getVariableExpenseTotal(
          userIds,
          monthStart,
          now,
        );
      avgDailyVariableExpense = variableSoFar / today;
    }

    const round2 = (v: number) => Math.round(v * 100) / 100;
    const estimatedVariableExpense = round2(
      avgDailyVariableExpense * daysRemaining,
    );

    // Transações JÁ materializadas mas datadas no FUTURO do mês (ex.: salário do
    // dia 5 lançado quando hoje é dia 3, ou uma compra avulsa pós-datada). Elas
    // não entram no "saldo hoje" (summary vai só até now) nem no loop de
    // recorrências (que pula as já materializadas) — sem isto, some do cálculo.
    // Janela: início de amanhã → fim do mês. Não há dupla contagem com o loop de
    // recorrências: aquele conta as NÃO materializadas; esta, as JÁ
    // materializadas — conjuntos disjuntos. Somamos ao "a receber/a pagar" para
    // aparecer no breakdown da UI, não só no total.
    const tomorrow = new Date(year, month, today + 1, 0, 0, 0, 0);
    const materializedFuture =
      today < lastDayOfMonth
        ? await this.transactionsRepository.getMaterializedTotals(
            userIds,
            tomorrow,
            monthEnd,
          )
        : { income: 0, expense: 0 };

    pendingIncome = round2(pendingIncome + materializedFuture.income);
    pendingExpense = round2(pendingExpense + materializedFuture.expense);

    const projectedBalance = round2(
      summary.balance +
        pendingIncome -
        pendingExpense -
        estimatedVariableExpense,
    );

    return {
      currentBalance: summary.balance,
      projectedBalance,
      pendingIncome,
      pendingExpense,
      estimatedVariableExpense,
      avgDailyVariableExpense: round2(avgDailyVariableExpense),
      daysRemaining,
      pending,
    };
  }
}
