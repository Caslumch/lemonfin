import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UsersRepository } from '../../users/repositories/users.repository';
import {
  WmodeClientService,
  type BulkMessageParams,
} from '../../whatsapp/services/wmode-client.service';
import { MailService } from '../../mail/services/mail.service';
import { PremiumAccessService } from '../../billing/services/premium-access.service';
import { ReminderLogRepository } from '../repositories/reminder-log.repository';

// Antecedência do aviso: entra na janela 3 dias antes do fim do trial.
const NOTICE_WINDOW_DAYS = 3;

// Aviso de FIM DE TRIAL (e-mail + WhatsApp). Sem ele, ligar o paywall
// (BILLING_ENFORCEMENT=on) causaria lockout silencioso: o usuário
// WhatsApp-first nunca vê o banner do web e descobriria o fim do teste só
// quando o bot respondesse "assine". Comunicação de BILLING, não marketing:
// NÃO respeita o opt-out de alertas (alertsEnabled) — perder acesso sem aviso
// é pior que uma mensagem a mais.
@Injectable()
export class TrialReminderService {
  private readonly logger = new Logger(TrialReminderService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly wmodeClient: WmodeClientService,
    private readonly mail: MailService,
    private readonly premiumAccess: PremiumAccessService,
    private readonly reminderLog: ReminderLogRepository,
  ) {}

  // Todo dia às 10:00 de Brasília. Janela [agora, agora+3d]: quem entra nela
  // recebe UMA vez (dedupe por trialEndsAt); se o cron falhar um dia, pega no
  // seguinte enquanto o trial não venceu.
  @Cron('0 10 * * *', { timeZone: 'America/Sao_Paulo' })
  async sendTrialEndingNotices(now: Date = new Date()) {
    this.logger.log('Running trial-ending notices...');

    const windowEnd = new Date(
      now.getTime() + NOTICE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const users = await this.usersRepository.findTrialsEndingBetween(
      now,
      windowEnd,
    );

    // Fase 1: claim + e-mail (síncrono, não sofre rajada) por usuário. O WhatsApp
    // NÃO é enviado aqui — vira item de lote. `emailOk` viaja no `ref` para o
    // release final saber se algum canal chegou a sair.
    const batch: BulkMessageParams[] = [];
    for (const user of users) {
      try {
        const prepared = await this.prepareForUser(user);
        if (prepared) batch.push(prepared);
      } catch (error) {
        this.logger.error(`Trial notice prep failed for user ${user.id}: ${error}`);
      }
    }

    if (batch.length === 0) return;

    // Fase 2: WhatsApp em lote — o WMode espaça com o ritmo anti-ban.
    const result = await this.wmodeClient.sendBulk(batch);

    // Release do claim quando NENHUM canal entregou: WhatsApp recusado/falho E
    // o e-mail também falhou. Se o e-mail saiu, o aviso cumpriu seu papel —
    // mantém o claim mesmo que o WhatsApp tenha sido recusado.
    const refOf = (r: unknown) => r as { dedupeKey: string; emailOk: boolean };
    let released = 0;

    const decide = (whatsappDelivered: boolean, ref: unknown) => {
      const { dedupeKey, emailOk } = refOf(ref);
      if (!whatsappDelivered && !emailOk) return dedupeKey;
      return null;
    };

    if (!result) {
      // Falha total do lote: WhatsApp não saiu para ninguém.
      const toRelease = batch
        .map((b) => decide(false, b.ref))
        .filter((k): k is string => k !== null);
      if (toRelease.length > 0) await this.reminderLog.release(toRelease);
      released = toRelease.length;
      this.logger.warn(`Trial notices: lote falhou; ${released} claim(s) liberados (sem e-mail)`);
    } else {
      const toRelease = result.results
        .map((r) => decide(r.status === 'queued', r.ref))
        .filter((k): k is string => k !== null);
      if (toRelease.length > 0) await this.reminderLog.release(toRelease);
      released = toRelease.length;
      this.logger.log(
        `Trial notices: ${result.queued} WhatsApp enfileirados, ${result.rejected} recusados, ${released} sem nenhum canal`,
      );
    }
  }

  /** Resolve elegibilidade, faz o claim e envia o E-MAIL (síncrono). Retorna o
   * item de WhatsApp para o lote, ou null se o usuário não deve ser notificado.
   * Usuário sem telefone é notificado só por e-mail aqui e não entra no lote. */
  private async prepareForUser(user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    trialEndsAt: Date | null;
  }): Promise<BulkMessageParams | null> {
    if (!user.trialEndsAt) return null;

    // Membro coberto pelo premium da família não precisa assinar — avisar
    // "seu teste acaba" seria falso alarme.
    const access = await this.premiumAccess.resolve(user.id);
    if (access.hasPremium && access.source === 'family') return null;

    const endsKey = user.trialEndsAt.toISOString().split('T')[0];
    const dedupeKey = `trial_ending:${user.id}:${endsKey}`;
    const claimed = await this.reminderLog.claim({
      userId: user.id,
      kind: 'trial_ending',
      refId: user.id,
      dedupeKey,
      channel: user.phone ? 'whatsapp' : 'email',
    });
    if (!claimed) return null; // já avisado para este fim de trial

    let emailOk = false;
    try {
      await this.mail.sendTrialEnding(user.email, user.name, user.trialEndsAt);
      emailOk = true;
    } catch (error) {
      this.logger.warn(`Trial notice e-mail falhou [user:${user.id}]: ${error}`);
    }

    // Sem telefone: só e-mail. Não entra no lote; resolve o claim aqui mesmo.
    if (!user.phone) {
      if (!emailOk) await this.reminderLog.release([dedupeKey]);
      return null;
    }

    const firstName = user.name.split(' ')[0];
    const when = user.trialEndsAt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
    const appUrl = process.env.FRONTEND_URL ?? 'https://app.lemonfin.com.br';
    return {
      to: user.phone,
      content:
        `Oi, ${firstName}! 🍋\n\n` +
        `Seu teste grátis do LemonFin termina em *${when}*. ` +
        `Pra continuar registrando seus gastos por aqui e recebendo os ` +
        `lembretes, é só assinar:\n\n${appUrl}/assinar\n\n` +
        `_Seus dados continuam salvos de qualquer forma 😉_`,
      ref: { dedupeKey, emailOk },
    };
  }
}
