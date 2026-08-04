import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UsersRepository } from '../../users/repositories/users.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { RecurringRepository } from '../../recurring/repositories/recurring.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import { WmodeClientService } from '../../whatsapp/services/wmode-client.service';
import { PremiumAccessService } from '../../billing/services/premium-access.service';
import { ReminderSettingsRepository } from '../repositories/reminder-settings.repository';
import { ReminderLogRepository } from '../repositories/reminder-log.repository';
import { cardCycleRange, nextDueDate } from '../../cards/utils/card-cycle';
import {
  resolveRecurringDay,
  type BusinessDayAdjustment,
} from '../../../common/utils/business-day';

// Um item a lembrar (conta fixa ou fatura), já com a chave de idempotência.
interface DueItem {
  kind: 'bill' | 'card_invoice';
  refId: string;
  dedupeKey: string;
  line: string; // linha pronta da mensagem
}

@Injectable()
export class BillRemindersService {
  private readonly logger = new Logger(BillRemindersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly familyContext: FamilyContextService,
    private readonly recurringRepository: RecurringRepository,
    private readonly cardsRepository: CardsRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly wmodeClient: WmodeClientService,
    private readonly premiumAccess: PremiumAccessService,
    private readonly settings: ReminderSettingsRepository,
    private readonly reminderLog: ReminderLogRepository,
  ) {}

  // Todo dia às 09:00 de Brasília (manhã, antes de o dia "acontecer") — avisa
  // vencimentos que caem daqui a `daysBefore` dias (config por usuário).
  @Cron('0 9 * * *', { timeZone: 'America/Sao_Paulo' })
  async sendBillReminders(now: Date = new Date()) {
    this.logger.log('Running bill reminders...');

    const users = await this.usersRepository.findAllWithPhone();
    for (const user of users) {
      try {
        await this.sendForUser(user.id, user.name, user.phone!, now);
      } catch (error) {
        this.logger.error(`Bill reminder failed for user ${user.id}: ${error}`);
      }
    }
  }

  private async sendForUser(
    userId: string,
    name: string | null,
    phone: string,
    now: Date,
  ) {
    // Lembretes são premium (trial conta como acesso) e respeitam o opt-out.
    if (!(await this.premiumAccess.hasAccess(userId))) return;
    const setting = await this.settings.getEffective(userId);
    if (!setting.billsEnabled) return;

    // Data-alvo: hoje (dia civil de Brasília) + antecedência, ancorada ao
    // meio-dia UTC (convenção do projeto para datas civis).
    const [y, m, d] = now
      .toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      .split('-')
      .map(Number);
    const target = new Date(Date.UTC(y, m - 1, d + setting.daysBefore, 12));
    const targetY = target.getUTCFullYear();
    const targetM = target.getUTCMonth();
    const targetDay = target.getUTCDate();
    const targetKey = target.toISOString().split('T')[0];

    const userIds = await this.familyContext.resolveUserIds(userId);
    const items: DueItem[] = [];

    // Contas fixas (só DESPESAS — ninguém precisa de lembrete pra receber) que
    // caem na data-alvo, com a MESMA régua do materializador (clamp de fim de
    // mês + ajuste de dia útil).
    const recurrings = await this.recurringRepository.findMany(userIds, true);
    for (const rec of recurrings) {
      if (rec.type !== 'EXPENSE') continue;
      const effectiveDay = resolveRecurringDay(
        targetY,
        targetM,
        rec.dayOfMonth,
        rec.businessDayAdjustment as BusinessDayAdjustment,
      );
      if (effectiveDay !== targetDay) continue;
      items.push({
        kind: 'bill',
        refId: rec.id,
        // Chave por destinatário: numa família, cada membro com telefone
        // recebe (e deduplica) o próprio lembrete.
        dedupeKey: `bill:${userId}:${rec.id}:${targetKey}`,
        line: `• ${rec.category?.icon ?? '📌'} *${rec.description}* — ${formatBRL(rec.amount.toNumber())}`,
      });
    }

    // Faturas de cartão que VENCEM na data-alvo — só se a fatura tiver gasto
    // (fatura zerada é ruído, decisão de produto do plano de lembretes).
    const cards = await this.cardsRepository.findMany(userIds);
    for (const card of cards) {
      if (card.dueDay == null) continue;
      const cycle = this.cycleDueOn(card.closingDay, card.dueDay, target);
      if (!cycle) continue;
      const { total } = await this.transactionsRepository.getCardSummary(
        userIds,
        card.id,
        cycle.start.toISOString(),
        cycle.end.toISOString(),
      );
      if (total <= 0) continue;
      items.push({
        kind: 'card_invoice',
        refId: card.id,
        dedupeKey: `card_invoice:${userId}:${card.id}:${targetKey}`,
        line: `• 💳 Fatura do *${card.name}* — ${formatBRL(total)}`,
      });
    }

    if (items.length === 0) return;

    // Claim ANTES de enviar (idempotência): só entram na mensagem os itens
    // ainda não lembrados para este vencimento.
    const claimed: DueItem[] = [];
    for (const item of items) {
      const ok = await this.reminderLog.claim({
        userId,
        kind: item.kind,
        refId: item.refId,
        dedupeKey: item.dedupeKey,
        channel: 'whatsapp',
      });
      if (ok) claimed.push(item);
    }
    if (claimed.length === 0) return;

    const when =
      setting.daysBefore === 0
        ? 'HOJE'
        : setting.daysBefore === 1
          ? 'amanhã'
          : `em ${setting.daysBefore} dias (${formatDayMonth(target)})`;
    const greeting = name ? `Oi, ${name.split(' ')[0]}!` : 'Oi!';
    const message = [
      '⏰ *Vencimentos chegando*',
      '',
      greeting,
      '',
      `Vence ${when}:`,
      '',
      ...claimed.map((i) => i.line),
      '',
      'Já deixa separado pra não pesar depois 😉',
    ].join('\n');

    try {
      await this.wmodeClient.sendMessage({ to: phone, content: message });
    } catch (error) {
      // Envio falhou: libera os claims para o lembrete valer numa nova
      // tentativa — senão ficaria "enviado" sem mensagem entregue.
      await this.reminderLog.release(claimed.map((i) => i.dedupeKey));
      throw error;
    }

    this.logger.log(
      `Sent ${claimed.length} due-bill reminder(s) to ${phone} (target ${targetKey})`,
    );
  }

  // Ciclo de fatura cujo VENCIMENTO cai exatamente na data-alvo. O vencimento
  // deriva do fechamento (nextDueDate), então testa o ciclo que fecha no mês
  // do alvo e o do mês anterior — um dos dois vence no alvo, ou nenhum.
  private cycleDueOn(
    closingDay: number,
    dueDay: number,
    target: Date,
  ): { start: Date; end: Date } | null {
    for (const offset of [0, -1]) {
      const ref = new Date(
        Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + offset, 1),
      );
      const cycle = cardCycleRange(closingDay, ref);
      const due = nextDueDate(dueDay, cycle.end);
      if (
        due.getUTCFullYear() === target.getUTCFullYear() &&
        due.getUTCMonth() === target.getUTCMonth() &&
        due.getUTCDate() === target.getUTCDate()
      ) {
        return cycle;
      }
    }
    return null;
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
