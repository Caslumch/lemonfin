import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UsersRepository } from '../../users/repositories/users.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import {
  WmodeClientService,
  type BulkMessageParams,
} from '../../whatsapp/services/wmode-client.service';
import { PushDispatchService } from '../../push/services/push-dispatch.service';
import { PremiumAccessService } from '../../billing/services/premium-access.service';
import { ReminderSettingsRepository } from '../repositories/reminder-settings.repository';
import { ReminderLogRepository } from '../repositories/reminder-log.repository';

@Injectable()
export class DailySummaryService {
  private readonly logger = new Logger(DailySummaryService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly familyContext: FamilyContextService,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly wmodeClient: WmodeClientService,
    private readonly pushDispatch: PushDispatchService,
    private readonly premiumAccess: PremiumAccessService,
    private readonly settings: ReminderSettingsRepository,
    private readonly reminderLog: ReminderLogRepository,
  ) {}

  // Todo dia às 08:00 de Brasília — "bom dia" com o resumo de ONTEM + o
  // acumulado do mês. OPT-IN (dailySummaryEnabled, default desligado): mensagem
  // diária só para quem pediu.
  @Cron('0 8 * * *', { timeZone: 'America/Sao_Paulo' })
  async sendDailySummaries(now: Date = new Date()) {
    this.logger.log('Running daily summaries...');

    const users = await this.usersRepository.findAllReminderTargets();

    // Fase 1: por usuario, dispara o PUSH (item a item, como sempre foi) e
    // PREPARA o item de WhatsApp ja com o claim feito. Nada de WhatsApp e
    // enviado aqui - so coletamos os itens reservados (idempotencia intacta).
    const batch: BulkMessageParams[] = [];
    for (const user of users) {
      try {
        const prepared = await this.prepareForUser(
          user.id,
          user.name,
          user.phone,
          now,
        );
        if (prepared) batch.push(prepared);
      } catch (error) {
        this.logger.error(`Daily summary failed for user ${user.id}: ${error}`);
      }
    }

    if (batch.length === 0) return;

    // Fase 2: UMA chamada em lote. O WMode espaca os envios com o proprio ritmo
    // anti-ban - o LemonFin nao dispara mais em rajada.
    const result = await this.wmodeClient.sendBulk(batch);

    const dedupeKeyOf = (ref: unknown) =>
      (ref as { dedupeKey: string }).dedupeKey;

    // Falha total (rede/5xx): libera TODOS os claims para o proximo cron.
    if (!result) {
      await this.reminderLog.release(batch.map((b) => dedupeKeyOf(b.ref)));
      this.logger.warn(
        'Daily summaries: envio em lote falhou por completo; claims liberados',
      );
      return;
    }

    // Libera o claim so dos itens RECUSADOS (429/guardrail) - ficam pendentes
    // e sao reenviados no proximo cron. Os `queued` mantem o claim.
    const toRelease = result.results
      .filter((r) => r.status === 'rejected')
      .map((r) => dedupeKeyOf(r.ref));
    if (toRelease.length > 0) await this.reminderLog.release(toRelease);

    this.logger.log(
      `Daily summaries: ${result.queued} enfileiradas, ${result.rejected} recusadas`,
    );
  }

  /** Dispara o push do usuario e devolve o item de WhatsApp para o lote (ou
   * null quando nao ha resumo / nao ha telefone). */
  private async prepareForUser(
    userId: string,
    name: string | null,
    phone: string | null,
    now: Date,
  ): Promise<BulkMessageParams | null> {
    // Premium (trial conta) + opt-in explícito.
    if (!(await this.premiumAccess.hasAccess(userId))) return null;
    const setting = await this.settings.getEffective(userId);
    if (!setting.dailySummaryEnabled) return null;

    // ONTEM no dia civil de Brasília (mesma régua do bill-reminders); as
    // janelas em UTC casam com a gravação noon-UTC das transações.
    const [y, m, d] = now
      .toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      .split('-')
      .map(Number);
    const dayStart = new Date(Date.UTC(y, m - 1, d - 1));
    const dayEnd = new Date(Date.UTC(y, m - 1, d - 1, 23, 59, 59));
    // Mês DE ONTEM até o fim de ontem — no dia 1º, o resumo fecha o mês
    // anterior em vez de mostrar um "mês atual" vazio.
    const monthStart = new Date(
      Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), 1),
    );
    const dayKey = dayStart.toISOString().split('T')[0];

    const userIds = await this.familyContext.resolveUserIds(userId);
    const [day, month, categories] = await Promise.all([
      this.transactionsRepository.getSummary(
        userIds,
        dayStart.toISOString(),
        dayEnd.toISOString(),
      ),
      this.transactionsRepository.getSummary(
        userIds,
        monthStart.toISOString(),
        dayEnd.toISOString(),
      ),
      this.transactionsRepository.getCategoryBreakdown(
        userIds,
        dayStart.toISOString(),
        dayEnd.toISOString(),
      ),
    ]);

    // "Gastou" aqui é CONSUMO: fora-cartão + compras no cartão. Sem o cartão,
    // usuário de crédito veria R$ 0 todo dia. Pagamento de fatura fica de fora
    // (quitação de compras já contadas — getSummary já separa).
    const daySpent = day.expense + day.cardExpense;
    const monthSpent = month.expense + month.cardExpense;

    // Dia sem movimento → silêncio. Mensagem diária de "não teve nada" é ruído.
    if (daySpent <= 0 && day.income <= 0) return null;

    // Push (resumo curto) — para devices registrados.
    const pushKey = `push:daily_summary:${userId}:${dayKey}`;
    const pushClaimed = await this.reminderLog.claim({
      userId,
      kind: 'daily_summary',
      refId: dayKey,
      dedupeKey: pushKey,
      channel: 'push',
    });
    if (pushClaimed) {
      const parts: string[] = [];
      if (daySpent > 0) parts.push(`Gastou ${formatBRL(daySpent)}`);
      if (day.income > 0) parts.push(`recebeu ${formatBRL(day.income)}`);
      const body = `${capitalize(parts.join(' e '))} ontem · Mês: ${formatBRL(monthSpent)} em gastos.`;
      const delivered = await this.pushDispatch.sendToUser(userId, {
        title: `☀️ Resumo de ontem (${formatDayMonth(dayStart)})`,
        body,
        data: { type: 'daily_summary' },
      });
      if (!delivered) await this.reminderLog.release([pushKey]);
      else
        this.logger.log(
          `Sent daily summary push to user ${userId} (day ${dayKey})`,
        );
    }

    // WhatsApp (mensagem rica) - so para quem tem telefone. Cada canal tem seu
    // proprio claim de idempotencia (chaves distintas).
    if (!phone) return null;
    return this.prepareWhatsapp(userId, name, phone, dayKey, {
      daySpent,
      dayIncome: day.income,
      monthSpent,
      monthIncome: month.income,
      monthStart,
      dayStart,
      categories,
    });
  }

  /** Faz o claim e monta a mensagem - SEM enviar. O envio acontece no lote
   * (sendBulk); a dedupeKey viaja em `ref` para o release seletivo. */
  private async prepareWhatsapp(
    userId: string,
    name: string | null,
    phone: string,
    dayKey: string,
    d: {
      daySpent: number;
      dayIncome: number;
      monthSpent: number;
      monthIncome: number;
      monthStart: Date;
      dayStart: Date;
      categories: {
        count: number;
        total: number;
        category?: { icon?: string | null; name?: string | null } | null;
      }[];
    },
  ): Promise<BulkMessageParams | null> {
    const dedupeKey = `daily_summary:${userId}:${dayKey}`;
    const claimed = await this.reminderLog.claim({
      userId,
      kind: 'daily_summary',
      refId: dayKey,
      dedupeKey,
      channel: 'whatsapp',
    });
    if (!claimed) return null;

    const count = d.categories.reduce((acc, c) => acc + c.count, 0);
    const topCategories = d.categories.slice(0, 3).map((c) => {
      const icon = c.category?.icon ?? '🏷️';
      const catName = c.category?.name ?? 'Outros';
      return `  ${icon} ${catName}: ${formatBRL(c.total)}`;
    });

    const greeting = name ? `Oi, ${name.split(' ')[0]}!` : 'Oi!';
    const monthLabel = capitalize(
      new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        timeZone: 'UTC',
      }).format(d.monthStart),
    );

    const lines = [`☀️ *Resumo de ontem (${formatDayMonth(d.dayStart)})*`, ''];
    lines.push(greeting, '');
    if (d.daySpent > 0) {
      const plural = count === 1 ? 'lançamento' : 'lançamentos';
      lines.push(
        `💸 Gastou: ${formatBRL(d.daySpent)}${count > 0 ? ` em ${count} ${plural}` : ''}`,
      );
      lines.push(...topCategories);
    }
    if (d.dayIncome > 0) {
      lines.push(`💰 Recebeu: ${formatBRL(d.dayIncome)}`);
    }
    lines.push(
      '',
      `📅 *${monthLabel} até agora:* ${formatBRL(d.monthSpent)} gastos • ${formatBRL(d.monthIncome)} recebidos`,
      '',
      'Bom dia! 🍋',
    );

    // Item pronto para o lote. A dedupeKey viaja em `ref`; se o WMode recusar
    // este item (ou o lote falhar por completo), o cron libera o claim.
    return {
      to: phone,
      content: lines.join('\n'),
      ref: { dedupeKey },
    };
  }
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDayMonth(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
