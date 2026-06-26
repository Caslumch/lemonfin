import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { InvoicePaymentRepository } from '../repositories/invoice-payment.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class UndoInvoicePaymentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicePaymentRepository: InvoicePaymentRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  // Desfaz um pagamento: apaga o registro InvoicePayment e a despesa gerada,
  // numa única transação (atômico). A FK transaction_id é SetNull, então a
  // exclusão da transação não removeria o registro sozinha — apagamos ambos.
  async execute(paymentId: string, userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);

    const payment = await this.invoicePaymentRepository.findById(
      paymentId,
      userIds,
    );
    if (!payment) {
      throw new NotFoundException('Pagamento nao encontrado');
    }

    await this.prisma.$transaction([
      this.prisma.invoicePayment.delete({ where: { id: payment.id } }),
      ...(payment.transactionId
        ? [
            this.prisma.transaction.deleteMany({
              where: {
                id: payment.transactionId,
                userId: { in: userIds },
              },
            }),
          ]
        : []),
    ]);

    return { id: payment.id, cardId: payment.cardId, cycle: payment.cycle };
  }
}
