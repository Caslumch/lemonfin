import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Conferência da fatura fechada contra o total real informado pelo usuário. O
 * app não tem conexão bancária, então o usuário digita o total da fatura e o
 * app grava aqui o que foi informado + a transação de ajuste (quando faltava).
 * Um registro por cartão+ciclo (upsert: conferir de novo sobrescreve).
 */
@Injectable()
export class InvoiceReconciliationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Registro do ciclo (para o selo "conferida" na tela). Escopo familiar.
  async findByCardCycle(cardId: string, cycle: string, userIds: string[]) {
    return this.prisma.invoiceReconciliation.findFirst({
      where: { cardId, cycle, userId: { in: userIds } },
    });
  }

  // Registros de vários ciclos de um cartão (para o front marcar quais faturas
  // já foram conferidas de uma vez).
  async findManyByCard(cardId: string, userIds: string[]) {
    return this.prisma.invoiceReconciliation.findMany({
      where: { cardId, userId: { in: userIds } },
    });
  }

  // Grava/atualiza a conferência do ciclo. Conferir de novo substitui o valor
  // informado e a transação de ajuste ligada (o unique cardId+cycle garante 1).
  async upsert(data: {
    userId: string;
    cardId: string;
    cycle: string;
    informedTotal: number;
    adjustmentId: string | null;
  }) {
    return this.prisma.invoiceReconciliation.upsert({
      where: { cardId_cycle: { cardId: data.cardId, cycle: data.cycle } },
      create: {
        userId: data.userId,
        cardId: data.cardId,
        cycle: data.cycle,
        informedTotal: new Prisma.Decimal(data.informedTotal),
        adjustmentId: data.adjustmentId,
      },
      update: {
        informedTotal: new Prisma.Decimal(data.informedTotal),
        adjustmentId: data.adjustmentId,
        reconciledAt: new Date(),
      },
    });
  }
}
