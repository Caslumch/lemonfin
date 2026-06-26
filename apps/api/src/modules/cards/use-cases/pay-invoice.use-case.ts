import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CardsRepository } from '../repositories/cards.repository';
import { InvoicePaymentRepository } from '../repositories/invoice-payment.repository';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { cardCycleRange, invoicePaymentStatus } from '../utils/card-cycle';
import type { PayInvoiceInput } from '../dtos/card.dto';

const PAYMENT_CATEGORY_SLUG = 'pagamento-fatura';

@Injectable()
export class PayInvoiceUseCase {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly invoicePaymentRepository: InvoicePaymentRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(cardId: string, userId: string, input: PayInvoiceInput) {
    const userIds = await this.familyContext.resolveUserIds(userId);

    const card = await this.cardsRepository.findById(cardId, userIds);
    if (!card) {
      throw new NotFoundException('Cartao nao encontrado');
    }

    if (input.amount <= 0) {
      throw new BadRequestException('O valor do pagamento deve ser positivo.');
    }

    // Ciclo a partir do "YYYY-MM" informado (mesma régua de getInvoice).
    const [year, month] = input.cycle.split('-').map(Number);
    const ref = new Date(year, month - 1, 1);
    const { start, end } = cardCycleRange(card.closingDay, ref);

    const category = await this.categoriesRepository.findBySlug(
      PAYMENT_CATEGORY_SLUG,
    );
    if (!category) {
      throw new NotFoundException(
        'Categoria "Pagamento de fatura" nao encontrada (rode o seed).',
      );
    }

    // Data do pagamento ancorada ao meio-dia UTC (sobrevive ao fuso BR).
    const base = input.paidAt ? new Date(input.paidAt) : new Date();
    const paidAt = new Date(
      Date.UTC(
        base.getUTCFullYear(),
        base.getUTCMonth(),
        base.getUTCDate(),
        12,
        0,
        0,
      ),
    );

    // 1) Despesa fora-cartão (sai do bolso, desconta do saldo).
    const tx = await this.transactionsRepository.create({
      amount: input.amount,
      type: 'EXPENSE',
      description: `Pagamento fatura ${card.name} (${input.cycle})`,
      date: paidAt.toISOString(),
      source: 'MANUAL',
      userId,
      categoryId: category.id,
      // cardId omitido = null: é um pagamento, não um gasto no cartão.
    });

    // 2) Registro do pagamento ligado ao ciclo + à despesa.
    await this.invoicePaymentRepository.create({
      userId,
      cardId,
      cycle: input.cycle,
      amount: input.amount,
      paidAt,
      transactionId: tx.id,
    });

    // Status atualizado do ciclo.
    const { total } = await this.transactionsRepository.getCardSummary(
      userIds,
      cardId,
      start.toISOString(),
      end.toISOString(),
    );
    const paid = await this.invoicePaymentRepository.sumByCycle(
      cardId,
      input.cycle,
      userIds,
    );

    return {
      cycle: input.cycle,
      total,
      paid,
      paymentStatus: invoicePaymentStatus(total, paid),
    };
  }
}
