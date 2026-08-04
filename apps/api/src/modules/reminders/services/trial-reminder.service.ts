import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UsersRepository } from '../../users/repositories/users.repository';
import { WmodeClientService } from '../../whatsapp/services/wmode-client.service';
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

    for (const user of users) {
      try {
        await this.notifyUser(user);
      } catch (error) {
        this.logger.error(`Trial notice failed for user ${user.id}: ${error}`);
      }
    }
  }

  private async notifyUser(user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    trialEndsAt: Date | null;
  }) {
    if (!user.trialEndsAt) return;

    // Membro coberto pelo premium da família não precisa assinar — avisar
    // "seu teste acaba" seria falso alarme.
    const access = await this.premiumAccess.resolve(user.id);
    if (access.hasPremium && access.source === 'family') return;

    const endsKey = user.trialEndsAt.toISOString().split('T')[0];
    const claimed = await this.reminderLog.claim({
      userId: user.id,
      kind: 'trial_ending',
      refId: user.id,
      dedupeKey: `trial_ending:${user.id}:${endsKey}`,
      channel: user.phone ? 'whatsapp' : 'email',
    });
    if (!claimed) return; // já avisado para este fim de trial

    const failures: string[] = [];

    try {
      await this.mail.sendTrialEnding(user.email, user.name, user.trialEndsAt);
    } catch (error) {
      failures.push(`email: ${error}`);
    }

    if (user.phone) {
      const firstName = user.name.split(' ')[0];
      const when = user.trialEndsAt.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });
      const appUrl = process.env.FRONTEND_URL ?? 'https://app.lemonfin.com.br';
      try {
        await this.wmodeClient.sendMessage({
          to: user.phone,
          content:
            `Oi, ${firstName}! 🍋\n\n` +
            `Seu teste grátis do LemonFin termina em *${when}*. ` +
            `Pra continuar registrando seus gastos por aqui e recebendo os ` +
            `lembretes, é só assinar:\n\n${appUrl}/assinar\n\n` +
            `_Seus dados continuam salvos de qualquer forma 😉_`,
        });
      } catch (error) {
        failures.push(`whatsapp: ${error}`);
      }
    }

    // Se NENHUM canal saiu, libera o claim para tentar de novo amanhã
    // (enquanto durar a janela).
    if (failures.length > 0 && failures.length === (user.phone ? 2 : 1)) {
      await this.reminderLog.release([`trial_ending:${user.id}:${endsKey}`]);
      this.logger.warn(
        `Trial notice não entregue em nenhum canal [user:${user.id}]: ${failures.join(' | ')}`,
      );
      return;
    }

    this.logger.log(
      `Trial-ending notice sent [user:${user.id}, ends:${endsKey}]` +
        (failures.length > 0 ? ` (parcial: ${failures.join(' | ')})` : ''),
    );
  }
}
