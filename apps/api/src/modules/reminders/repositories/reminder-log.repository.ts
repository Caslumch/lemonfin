import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ReminderLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Reivindica o envio ANTES de mandar a mensagem (claim atômico via unique).
  // Retorna false se já foi reivindicado (mesmo lembrete, mesmo vencimento) —
  // um restart no horário do cron não duplica a mensagem.
  async claim(params: {
    userId: string;
    kind: 'bill' | 'card_invoice' | 'trial_ending';
    refId: string;
    dedupeKey: string;
    channel: 'whatsapp' | 'email';
  }): Promise<boolean> {
    try {
      await this.prisma.reminderLog.create({ data: params });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false; // já enviado/reivindicado
      }
      throw error;
    }
  }

  // Desfaz claims cujo envio falhou — sem isso o usuário nunca receberia o
  // lembrete (o claim ficaria "queimado" sem mensagem entregue).
  async release(dedupeKeys: string[]): Promise<void> {
    if (dedupeKeys.length === 0) return;
    await this.prisma.reminderLog.deleteMany({
      where: { dedupeKey: { in: dedupeKeys } },
    });
  }
}
