import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionsRepository } from '../transactions/repositories/transactions.repository';
import { UsersRepository } from '../users/repositories/users.repository';
import { FamilyContextService } from '../families/services/family-context.service';
import { WmodeClientService } from '../whatsapp/services/wmode-client.service';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly familyContext: FamilyContextService,
    private readonly wmodeClient: WmodeClientService,
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
        this.logger.error(`Weekly summary failed for user ${user.id}: ${error}`);
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
        await this.sendMonthlyComparisonForUser(user.id, user.name, user.phone!);
      } catch (error) {
        this.logger.error(`Monthly comparison failed for user ${user.id}: ${error}`);
      }
    }
  }

  private async sendSpendingAlertsForUser(userId: string, phone: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const daysRemaining = Math.ceil(
      (currentEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    const [currentCategories, previousCategories] = await Promise.all([
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
    ]);

    const previousMap = new Map(
      previousCategories.map((c) => [c.categoryId, c]),
    );

    const alerts: string[] = [];

    for (const current of currentCategories) {
      const previous = previousMap.get(current.categoryId);
      if (!previous || previous.total === 0) continue;

      const percent = (current.total / previous.total) * 100;
      if (percent >= 80) {
        const icon = current.category?.icon ?? '';
        const name = current.category?.name ?? 'categoria';
        const formatted = formatBRL(current.total);
        const prevFormatted = formatBRL(previous.total);
        alerts.push(
          `${icon} *${name}*: ${formatted} de ${prevFormatted} (${Math.round(percent)}%) — faltam ${daysRemaining} dias`,
        );
      }
    }

    if (alerts.length > 0) {
      const message = [
        '⚠️ *Alerta de gastos*',
        '',
        'Voce ja gastou uma boa parte do que gastou no mes passado nestas categorias:',
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
      `📅 *No mes:* ${formatBRL(monthSummary.expense)} gastos de ${formatBRL(monthSummary.income)} recebidos`,
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
    // Previous month (the one that just ended)
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    // Two months ago
    const twoMonthsStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const twoMonthsEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);

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

    const prevMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(prevStart);
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
      const direction = overallVariation > 0 ? '📈 Aumento' : '📉 Reducao';
      lines.push(
        `${direction} de ${Math.abs(Math.round(overallVariation))}% nos gastos vs mes anterior`,
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
      lines.push('', '⬇️ *Categorias que mais diminuiram:*');
      for (const c of shrinking) {
        const icon = c.category?.icon ?? '';
        const catName = c.category?.name ?? 'Outros';
        lines.push(
          `  ${icon} ${catName}: ${Math.round(c.variation)}% (${formatBRL(c.total)})`,
        );
      }
    }

    lines.push('', 'Bom mes! 🍋');

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
