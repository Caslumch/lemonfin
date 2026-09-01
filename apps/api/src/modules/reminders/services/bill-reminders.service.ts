import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UsersRepository } from '../../users/repositories/users.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { RecurringRepository } from '../../recurring/repositories/recurring.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import {
  WmodeClientService,
  type BulkMessageParams,
} from '../../whatsapp/services/wmode-client.service';
import { PushDispatchService } from '../../push/services/push-dispatch.service';
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
  line: string; // linha pronta da mensagem (WhatsApp, com markdown)
  pushLabel: string; // versão curta em texto puro (push)
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
    private readonly pushDispatch: PushDispatchService,
    private readonly premiumAccess: PremiumAccessService,
    private readonly settings: ReminderSettingsRepository,
    private readonly reminderLog: ReminderLogRepository,
  ) {}

  // Todo dia às 09:00 de Brasília (manhã, antes de o dia "acontecer") — avisa
  // vencimentos que caem daqui a `daysBefore` dias (config por usuário).
  @Cron('0 9 * * *', { timeZone: 'America/Sao_Paulo' })
  async sendBillReminders(now: Date = new Date()) {
    this.logger.log('Running bill reminders...');

    const users = await this.usersRepository.findAllReminderTargets();

    // Fase 1: por usuário, dispara o PUSH (item a item, como sempre foi) e
    // PREPARA o item de WhatsApp. Cada item do lote carrega todas as suas
    // dedupeKeys em `ref` (um usuário pode ter N contas/faturas no lembrete).
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
        this.logger.error(`Bill reminder failed for user ${user.id}: ${error}`);
      }
    }

    if (batch.length === 0) return;

    // Fase 2: UMA chamada em lote para o WhatsApp — o WMode espaça com o ritmo
    // anti-ban, em vez da rajada de /send que derrubava a sessão.
    const result = await this.wmodeClient.sendBulk(batch);

    const dedupeKeysOf = (ref: unknown) =>
      (ref as { dedupeKeys: string[] }).dedupeKeys;

    // Falha total: libera todos os claims para o próximo cron.
    if (!result) {
      await this.reminderLog.release(batch.flatMap((b) => dedupeKeysOf(b.ref)));
      this.logger.warn(
        'Bill reminders: envio em lote falhou por completo; claims liberados',
      );
      return;
    }

    // Release só dos recusados (todas as dedupeKeys do item voltam a pendente).
    const toRelease = result.results
      .filter((r) => r.status === 'rejected')
      .flatMap((r) => dedupeKeysOf(r.ref));
    if (toRelease.length > 0) await this.reminderLog.release(toRelease);

    this.logger.log(
      `Bill reminders: ${result.queued} enfileirados, ${result.rejected} recusados`,
    );
  }

  /** Dispara o push do usuário e devolve o item de WhatsApp para o lote (ou
   * null quando não há o que lembrar / não há telefone). */
  private async prepareForUser(
    userId: string,
    name: string | null,
    phone: string | null,
    now: Date,
  ): Promise<BulkMessageParams | null> {
    // Lembretes são premium (trial conta como acesso) e respeitam o opt-out.
    if (!(await this.premiumAccess.hasAccess(userId))) return null;
    const setting = await this.settings.getEffective(userId);
    if (!setting.billsEnabled) return null;

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
        pushLabel: `${rec.description} — ${formatBRL(rec.amount.toNumber())}`,
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
        pushLabel: `Fatura do ${card.name} — ${formatBRL(total)}`,
      });
    }

    if (items.length === 0) return null;

    const when =
      setting.daysBefore === 0
        ? 'HOJE'
        : setting.daysBefore === 1
          ? 'amanhã'
          : `em ${setting.daysBefore} dias (${formatDayMonth(target)})`;

    // Cada canal deduplica de forma independente (chaves distintas), então um
    // usuário com telefone E app registrado recebe pelos dois.
    //
    // O PUSH continua item a item aqui: vai direto ao Expo, sem risco de ban e
    // sem ganho em agrupar. Só o WhatsApp é adiado para o lote.
    await this.sendPush(userId, when, targetKey, items);

    if (!phone) return null;
    return this.prepareWhatsapp(userId, name, phone, when, items);
  }

  /** Faz o claim dos itens e monta a mensagem — SEM enviar. O envio acontece
   * no lote (sendBulk); as dedupeKeys viajam em `ref` para o release seletivo
   * quando o WMode recusa/falha um item. */
  private async prepareWhatsapp(
    userId: string,
    name: string | null,
    phone: string,
    when: string,
    items: DueItem[],
  ): Promise<BulkMessageParams | null> {
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
    if (claimed.length === 0) return null;

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

    // Item pronto para o lote. Todas as dedupeKeys deste usuário viajam em
    // `ref`; se o lote recusar/falhar este item, o cron libera todas de uma vez.
    return {
      to: phone,
      content: message,
      ref: { dedupeKeys: claimed.map((i) => i.dedupeKey) },
    };
  }

  private async sendPush(
    userId: string,
    when: string,
    targetKey: string,
    items: DueItem[],
  ) {
    // Chave de dedupe própria do canal push (prefixo), independente do WhatsApp.
    const claimed: DueItem[] = [];
    const keys: string[] = [];
    for (const item of items) {
      const key = `push:${item.dedupeKey}`;
      const ok = await this.reminderLog.claim({
        userId,
        kind: item.kind,
        refId: item.refId,
        dedupeKey: key,
        channel: 'push',
      });
      if (ok) {
        claimed.push(item);
        keys.push(key);
      }
    }
    if (claimed.length === 0) return;

    const body =
      claimed.length === 1
        ? `${claimed[0].pushLabel} vence ${when}.`
        : `${claimed.length} vencimentos chegando ${when}.`;

    const delivered = await this.pushDispatch.sendToUser(userId, {
      title: '⏰ Vencimentos chegando',
      body,
      data: { type: 'bill_reminder' },
    });

    if (!delivered) {
      // Sem device ativo (ou todos inválidos): libera para valer numa próxima.
      await this.reminderLog.release(keys);
      return;
    }

    this.logger.log(
      `Sent ${claimed.length} due-bill push(es) to user ${userId} (target ${targetKey})`,
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
