import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// Janela de retenção dos eventos processados. O retry do Stripe dura até ~3
// dias; 30 dias dá folga para reenvios manuais pelo dashboard sem acumular
// lixo para sempre.
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class ProcessedStripeEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Reivindica o evento ANTES de processar (claim atômico via unique).
  // Retorna false se já foi processado — retry do Stripe pós-restart não
  // reprocessa (o dedupe anterior, em memória, morria junto com o processo).
  async claim(eventId: string, type: string): Promise<boolean> {
    try {
      await this.prisma.processedStripeEvent.create({
        data: { eventId, type },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false; // já processado (ou em processamento por outra instância)
      }
      throw error;
    }

    // Limpeza oportunista dos eventos fora da janela de retenção (barata:
    // webhooks de billing são raros e o índice em createdAt resolve).
    await this.prisma.processedStripeEvent.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
    });

    return true;
  }

  // Desfaz o claim quando o processamento falhou — permite reprocessar via
  // reenvio manual do dashboard do Stripe (devolvemos 200 mesmo em erro, então
  // o retry automático não vem).
  async release(eventId: string): Promise<void> {
    await this.prisma.processedStripeEvent.deleteMany({
      where: { eventId },
    });
  }
}
