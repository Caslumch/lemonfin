import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TransactionsRepository } from '../transactions/repositories/transactions.repository';
import { UsersRepository } from '../users/repositories/users.repository';
import { FamilyContextService } from '../families/services/family-context.service';
import { WmodeClientService } from '../whatsapp/services/wmode-client.service';
import { GoalsRepository } from '../goals/repositories/goals.repository';
import { RecurringRepository } from '../recurring/repositories/recurring.repository';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly familyContext: FamilyContextService,
    private readonly wmodeClient: WmodeClientService,
    private readonly goalsRepository: GoalsRepository,
    private readonly recurringRepository: RecurringRepository,
  ) {}

  // Run daily at 20:00 — check spending alerts
  @Cron('0 20 * * *')
  async checkSpendingAlerts() {
    this.logger.log('Running spending alerts check...');

    const users = await this.usersRepository.findAllWithPhone();

    for (const user of users) {
      try {
        await this.sendSpendingAlertsForUser(user.id, user.phone!);
      } catch (error) {
        this.logger.error(`Alert failed for user ${user.id}: ${error}`);
      }
    }
  }

  // Run every Sunday at 21:00 — weekly summary
  @Cron('0 21 * * 0')
  async sendWeeklySummaries() {
    this.logger.log('Running weekly summary...');

    const users = await this.usersRepository.findAllWithPhone();

    for (const user of users) {
      try {
        await this.sendWeeklySummaryForUser(user.id, user.name, user.phone!);
      } catch (error) {
        this.logger.error(
          `Weekly summary failed for user ${user.id}: ${error}`,
        );
      }
    }
  }

  // Run on 1st of every month at 10:00 — monthly comparison
  @Cron('0 10 1 * *')
  async sendMonthlyComparisons() {
    this.logger.log('Running monthly comparisons...');

    const users = await this.usersRepository.findAllWithPhone();

    for (const user of users) {
      try {
        await this.sendMonthlyComparisonForUser(
          user.id,
          user.name,
          user.phone!,
        );
      } catch (error) {
        this.logger.error(
          `Monthly comparison failed for user ${user.id}: ${error}`,
        );
      }
    }
  }

  // Run on 3rd of every month at 11:00 — detect possible subscriptions
  @Cron('0 11 3 * *')
  async detectSubscriptions() {
    this.logger.log('Running subscription detection...');

    const users = await this.usersRepository.findAllWithPhone();

    for (const user of users) {
      try {
        await this.detectSubscriptionsForUser(user.id, user.phone!);
      } catch (error) {
        this.logger.error(
          `Subscription detection failed for user ${user.id}: ${error}`,
        );
      }
    }
  }

  private async detectSubscriptionsForUser(userId: string, phone: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);

    // Janela: últimos 3 meses.
    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const [expenses, recurrences] = await Promise.all([
      this.transactionsRepository.findExpensesWithDescriptionSince(
        userIds,
        since,
      ),
      this.recurringRepository.findMany(userIds, false),
    ]);

    // Descrições que já são recorrências cadastradas (normalizadas).
    const knownRecurring = new Set(
      recurrences.map((r) => normalizeDesc(r.description)),
    );

    // Agrupa despesas por descrição normalizada → conjunto de meses distintos.
    interface Candidate {
      label: string;
      amount: number;
      categoryId: string;
      months: Set<string>;
    }
    const groups = new Map<string, Candidate>();

    for (const tx of expenses) {
      const key = normalizeDesc(tx.description ?? '');
      if (!key || knownRecurring.has(key)) continue;

      const d = new Date(tx.date);
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;

      const existing = groups.get(key);
      if (existing) {
        existing.months.add(monthKey);
      } else {
        groups.set(key, {
          label: tx.description ?? '',
          amount: tx.amount.toNumber(),
          categoryId: tx.categoryId,
          months: new Set([monthKey]),
        });
      }
    }

    // Candidatas: aparecem em 2+ meses distintos.
    const subscriptions = Array.from(groups.values())
      .filter((g) => g.months.size >= 2)
      .sort((a, b) => b.months.size - a.months.size)
      .slice(0, 5);

    if (subscriptions.length === 0) return;

    const lines = [
      '💡 *Possíveis assinaturas detectadas*',
      '',
      'Notei gastos que se repetem todo mês e ainda não estão cadastrados como recorrência:',
      '',
      ...subscriptions.map(
        (s) =>
          `• *${s.label}* (~${formatBRL(s.amount)}) — ${s.months.size} meses`,
      ),
      '',
      'Quer que eu lance automaticamente todo mês? Cadastre em *Recorrentes* no app, ou me diga aqui: _"todo dia X pago Y de Z"_.',
    ];

    await this.wmodeClient.sendMessage({
      to: phone,
      content: lines.join('\n'),
    });
    this.logger.log(
      `Sent ${subscriptions.length} subscription suggestion(s) to ${phone}`,
    );
  }

  // Run every Wednesday at 19:00 — detect spending out of pattern
  @Cron('0 19 * * 3')
  async detectAnomalies() {
    this.logger.log('Running anomaly detection...');

    const users = await this.usersRepository.findAllWithPhone();

    for (const user of users) {
      try {
        await this.detectAnomaliesForUser(user.id, user.phone!);
      } catch (error) {
        this.logger.error(
          `Anomaly detection failed for user ${user.id}: ${error}`,
        );
      }
    }
  }

  private async detectAnomaliesForUser(userId: string, phone: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const currentStart = new Date(year, month, 1);
    const currentEnd = new Date(year, month + 1, 0, 23, 59, 59);

    // Janela histórica: 3 meses anteriores (sem o atual).
    const histStart = new Date(year, month - 3, 1);
    const histEnd = new Date(year, month, 0, 23, 59, 59);

    const [currentCats, histCats] = await Promise.all([
      this.transactionsRepository.getCategoryBreakdown(
        userIds,
        currentStart.toISOString(),
        currentEnd.toISOString(),
      ),
      this.transactionsRepository.getCategoryBreakdown(
        userIds,
        histStart.toISOString(),
        histEnd.toISOString(),
      ),
    ]);

    // Média mensal histórica por categoria (total dos 3 meses / 3).
    const histAvg = new Map<string, number>();
    for (const c of histCats) {
      histAvg.set(c.categoryId, c.total / 3);
    }

    const anomalies: string[] = [];
    for (const cur of currentCats) {
      const avg = histAvg.get(cur.categoryId);
      // Precisa de histórico relevante para comparar.
      if (!avg || avg < 50) continue;

      const ratio = cur.total / avg;
      const excess = cur.total - avg;

      // Significativamente acima (>= 1.5x) e excedente relevante (>= R$100).
      if (ratio >= 1.5 && excess >= 100) {
        const icon = cur.category?.icon ?? '';
        const name = cur.category?.name ?? 'categoria';
        anomalies.push(
          `${icon} *${name}*: ${formatBRL(cur.total)} este mês — ` +
            `${Math.round((ratio - 1) * 100)}% acima da sua média (${formatBRL(avg)})`,
        );
      }
    }

    if (anomalies.length === 0) return;

    const message = [
      '🔎 *Gasto fora do padrão*',
      '',
      'Percebi gastos bem acima da sua média nestas categorias:',
      '',
      ...anomalies,
      '',
      'Vale dar uma olhada! 👀',
    ].join('\n');

    await this.wmodeClient.sendMessage({ to: phone, content: message });
    this.logger.log(`Sent ${anomalies.length} anomaly alert(s) to ${phone}`);
  }

  private async sendSpendingAlertsForUser(userId: string, phone: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const now = new Date();
    // Janelas de mês em UTC (casam com a gravação noon-UTC). Ver get-insights.
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const currentStart = new Date(Date.UTC(y, m, 1));
    const currentEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
    const previousStart = new Date(Date.UTC(y, m - 1, 1));
    const previousEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    const daysRemaining = Math.ceil(
      (currentEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    const [currentCategories, previousCategories, goals] = await Promise.all([
      this.transactionsRepository.getCategoryBreakdown(
        userIds,
        currentStart.toISOString(),
        currentEnd.toISOString(),
      ),
      this.transactionsRepository.getCategoryBreakdown(
        userIds,
        previousStart.toISOString(),
        previousEnd.toISOString(),
      ),
      this.goalsRepository.findMany(userIds, true),
    ]);

    const previousMap = new Map(
      previousCategories.map((c) => [c.categoryId, c]),
    );
    const goalsMap = new Map(goals.map((g) => [g.categoryId, g]));

    const alerts: string[] = [];

    for (const current of currentCategories) {
      const icon = current.category?.icon ?? '';
      const name = current.category?.name ?? 'categoria';
      const formatted = formatBRL(current.total);

      // Check against goal first, then fallback to previous month comparison
      const goal = goalsMap.get(current.categoryId);
      if (goal) {
        const goalLimit = goal?.amount?.toNumber();
        const percent = (current.total / goalLimit) * 100;
        if (percent >= 80) {
          const limitFormatted = formatBRL(goalLimit);
          const exceeded = current.total > goalLimit;
          const label = exceeded ? '🚨 Estourou' : '⚠️';
          alerts.push(
            `${label} ${icon} *${name}*: ${formatted} de ${limitFormatted} (${Math.round(percent)}%) — meta ${exceeded ? 'ultrapassada!' : `faltam ${daysRemaining} dias`}`,
          );
        }
        continue;
      }

      // Fallback: compare with previous month
      const previous = previousMap.get(current.categoryId);
      if (!previous || previous.total === 0) continue;

      const percent = (current.total / previous.total) * 100;
      if (percent >= 80) {
        const prevFormatted = formatBRL(previous.total);
        alerts.push(
          `${icon} *${name}*: ${formatted} de ${prevFormatted} (${Math.round(percent)}%) — faltam ${daysRemaining} dias`,
        );
      }
    }

    if (alerts.length > 0) {
      const hasGoalAlerts = goals.length > 0;
      const message = [
        '⚠️ *Alerta de gastos*',
        '',
        hasGoalAlerts
          ? 'Atenção com suas metas e gastos nestas categorias:'
          : 'Você já gastou uma boa parte do que gastou no mês passado nestas categorias:',
        '',
        ...alerts,
        '',
        'Fique de olho! 👀',
      ].join('\n');

      await this.wmodeClient.sendMessage({ to: phone, content: message });
      this.logger.log(`Sent ${alerts.length} alert(s) to ${phone}`);
    }
  }

  private async sendWeeklySummaryForUser(
    userId: string,
    name: string | null,
    phone: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [weekSummary, monthSummary, categories] = await Promise.all([
      this.transactionsRepository.getSummary(
        userIds,
        weekStart.toISOString(),
        now.toISOString(),
      ),
      this.transactionsRepository.getSummary(
        userIds,
        monthStart.toISOString(),
        now.toISOString(),
      ),
      this.transactionsRepository.getCategoryBreakdown(
        userIds,
        weekStart.toISOString(),
        now.toISOString(),
      ),
    ]);

    const topCategories = categories.slice(0, 3).map((c) => {
      const icon = c.category?.icon ?? '';
      const catName = c.category?.name ?? 'Outros';
      return `  ${icon} ${catName}: ${formatBRL(c.total)}`;
    });

    const greeting = name ? `Oi, ${name.split(' ')[0]}!` : 'Oi!';

    const message = [
      `📊 *Resumo da semana*`,
      '',
      greeting,
      '',
      `💸 Gastou: ${formatBRL(weekSummary.expense)}`,
      `💰 Recebeu: ${formatBRL(weekSummary.income)}`,
      `📈 Saldo da semana: ${formatBRL(weekSummary.balance)}`,
      '',
      '🏷️ *Top categorias da semana:*',
      ...topCategories,
      '',
      `📅 *No mês:* ${formatBRL(monthSummary.expense)} gastos de ${formatBRL(monthSummary.income)} recebidos`,
      '',
      'Boa semana! 🍋',
    ].join('\n');

    await this.wmodeClient.sendMessage({ to: phone, content: message });
    this.logger.log(`Sent weekly summary to ${phone}`);
  }

  private async sendMonthlyComparisonForUser(
    userId: string,
    name: string | null,
    phone: string,
  ) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    // Janelas em UTC (casam com a gravação noon-UTC). Ver get-insights.
    // Previous month (the one that just ended)
    const prevStart = new Date(Date.UTC(y, m - 1, 1));
    const prevEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59));
    // Two months ago
    const twoMonthsStart = new Date(Date.UTC(y, m - 2, 1));
    const twoMonthsEnd = new Date(Date.UTC(y, m - 1, 0, 23, 59, 59));

    const [prevSummary, twoMonthsSummary, prevCategories, twoMonthsCategories] =
      await Promise.all([
        this.transactionsRepository.getSummary(
          userIds,
          prevStart.toISOString(),
          prevEnd.toISOString(),
        ),
        this.transactionsRepository.getSummary(
          userIds,
          twoMonthsStart.toISOString(),
          twoMonthsEnd.toISOString(),
        ),
        this.transactionsRepository.getCategoryBreakdown(
          userIds,
          prevStart.toISOString(),
          prevEnd.toISOString(),
        ),
        this.transactionsRepository.getCategoryBreakdown(
          userIds,
          twoMonthsStart.toISOString(),
          twoMonthsEnd.toISOString(),
        ),
      ]);

    const twoMonthsMap = new Map(
      twoMonthsCategories.map((c) => [c.categoryId, c]),
    );

    // Find categories that grew or shrank the most
    const comparisons = prevCategories.map((current) => {
      const prev = twoMonthsMap.get(current.categoryId);
      const prevTotal = prev?.total ?? 0;
      const variation =
        prevTotal > 0
          ? ((current.total - prevTotal) / prevTotal) * 100
          : current.total > 0
            ? 100
            : 0;
      return { ...current, prevTotal, variation };
    });

    const growing = comparisons
      .filter((c) => c.variation > 10)
      .sort((a, b) => b.variation - a.variation)
      .slice(0, 3);

    const shrinking = comparisons
      .filter((c) => c.variation < -10)
      .sort((a, b) => a.variation - b.variation)
      .slice(0, 3);

    const overallVariation =
      twoMonthsSummary.expense > 0
        ? ((prevSummary.expense - twoMonthsSummary.expense) /
            twoMonthsSummary.expense) *
          100
        : 0;

    const prevMonth = new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
    }).format(prevStart);
    const greeting = name ? `Oi, ${name.split(' ')[0]}!` : 'Oi!';

    const lines = [
      `📅 *Comparativo de ${prevMonth}*`,
      '',
      greeting,
      '',
      `💸 Total gasto: ${formatBRL(prevSummary.expense)}`,
      `💰 Total recebido: ${formatBRL(prevSummary.income)}`,
      `📊 Saldo: ${formatBRL(prevSummary.balance)}`,
    ];

    if (overallVariation !== 0) {
      const direction = overallVariation > 0 ? '📈 Aumento' : '📉 Redução';
      lines.push(
        `${direction} de ${Math.abs(Math.round(overallVariation))}% nos gastos vs mês anterior`,
      );
    }

    if (growing.length > 0) {
      lines.push('', '⬆️ *Categorias que mais cresceram:*');
      for (const c of growing) {
        const icon = c.category?.icon ?? '';
        const catName = c.category?.name ?? 'Outros';
        lines.push(
          `  ${icon} ${catName}: +${Math.round(c.variation)}% (${formatBRL(c.total)})`,
        );
      }
    }

    if (shrinking.length > 0) {
      lines.push('', '⬇️ *Categorias que mais diminuíram:*');
      for (const c of shrinking) {
        const icon = c.category?.icon ?? '';
        const catName = c.category?.name ?? 'Outros';
        lines.push(
          `  ${icon} ${catName}: ${Math.round(c.variation)}% (${formatBRL(c.total)})`,
        );
      }
    }

    lines.push('', 'Bom mês! 🍋');

    await this.wmodeClient.sendMessage({
      to: phone,
      content: lines.join('\n'),
    });
    this.logger.log(`Sent monthly comparison to ${phone}`);
  }
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Normaliza descrição para agrupar variações ("Netflix", "netflix ", "NETFLIX")
// — minúsculas, sem acento, sem espaços/pontuação nas bordas.
function normalizeDesc(desc: string): string {
  return desc
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}
