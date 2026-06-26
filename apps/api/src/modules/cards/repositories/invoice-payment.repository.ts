import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Pagamentos de fatura de cartão. Cada registro liga um cartão + ciclo
 * ("YYYY-MM", o mesmo `month` de getInvoice) à despesa fora-cartão gerada.
 */
@Injectable()
export class InvoicePaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    cardId: string;
    cycle: string;
    amount: number;
    paidAt: Date;
    transactionId?: string;
  }) {
    return this.prisma.invoicePayment.create({
      data: {
        userId: data.userId,
        cardId: data.cardId,
        cycle: data.cycle,
        amount: new Prisma.Decimal(data.amount),
        paidAt: data.paidAt,
        transactionId: data.transactionId,
      },
    });
  }

  // Pagamentos de um ciclo (mais recentes primeiro) — para histórico/desfazer.
  async findByCardCycle(cardId: string, cycle: string, userIds: string[]) {
    return this.prisma.invoicePayment.findMany({
      where: { cardId, cycle, userId: { in: userIds } },
      orderBy: { paidAt: 'desc' },
    });
  }

  // Total já pago no ciclo (para derivar o status aberto/parcial/paga).
  async sumByCycle(
    cardId: string,
    cycle: string,
    userIds: string[],
  ): Promise<number> {
    const agg = await this.prisma.invoicePayment.aggregate({
      where: { cardId, cycle, userId: { in: userIds } },
      _sum: { amount: true },
    });
    return agg._sum.amount?.toNumber() ?? 0;
  }

  async findById(id: string, userIds: string[]) {
    return this.prisma.invoicePayment.findFirst({
      where: { id, userId: { in: userIds } },
    });
  }

  async delete(id: string) {
    return this.prisma.invoicePayment.delete({ where: { id } });
  }
}
