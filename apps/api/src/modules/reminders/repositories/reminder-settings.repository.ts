import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// Defaults quando o usuário nunca mexeu nas configurações (sem linha na
// tabela): tudo ligado, 3 dias de antecedência. Centralizado aqui para o
// cron e o controller lerem a mesma coisa.
export const REMINDER_DEFAULTS = {
  billsEnabled: true,
  daysBefore: 3,
  alertsEnabled: true,
  // Resumo diário é OPT-IN: mensagem de frequência diária sem pedido é spam.
  dailySummaryEnabled: false,
} as const;

export interface EffectiveReminderSettings {
  billsEnabled: boolean;
  daysBefore: number;
  alertsEnabled: boolean;
  dailySummaryEnabled: boolean;
}

@Injectable()
export class ReminderSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Preferências efetivas (linha do banco ou defaults). Nunca retorna null —
  // ausência de linha significa "nunca configurou", não "sem preferências".
  async getEffective(userId: string): Promise<EffectiveReminderSettings> {
    const row = await this.prisma.reminderSetting.findUnique({
      where: { userId },
    });
    if (!row) return { ...REMINDER_DEFAULTS };
    return {
      billsEnabled: row.billsEnabled,
      daysBefore: row.daysBefore,
      alertsEnabled: row.alertsEnabled,
      dailySummaryEnabled: row.dailySummaryEnabled,
    };
  }

  async upsert(
    userId: string,
    data: Partial<EffectiveReminderSettings>,
  ): Promise<EffectiveReminderSettings> {
    const row = await this.prisma.reminderSetting.upsert({
      where: { userId },
      create: { userId, ...REMINDER_DEFAULTS, ...data },
      update: data,
    });
    return {
      billsEnabled: row.billsEnabled,
      daysBefore: row.daysBefore,
      alertsEnabled: row.alertsEnabled,
      dailySummaryEnabled: row.dailySummaryEnabled,
    };
  }
}
