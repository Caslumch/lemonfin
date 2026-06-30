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

  // `input.amount` opcional: quando ausente (ex.: "paguei a fatura" no WhatsApp,
  // sem valor), paga o SALDO DEVEDOR (total do ciclo − já pago), não o total
  // bruto — senão pagar duas vezes registrava o total cheio de novo (cobrança em
  // dobro). Quando informado, é validado contra o saldo devedor.
  async execute(
    cardId: string,
    userId: string,
    input: Omit<PayInvoiceInput, 'amount'> & { amount?: number },
  ) {
    const userIds = await this.familyContext.resolveUserIds(userId);

    const card = await this.cardsRepository.findById(cardId, userIds);
    if (!card) {
      throw new NotFoundException('Cartao nao encontrado');
    }

    // Ciclo a partir do "YYYY-MM" informado (mesma régua de getInvoice).
    // ref em UTC para casar com cardCycleRange (régua em UTC).
    const [year, month] = input.cycle.split('-').map(Number);
    const ref = new Date(Date.UTC(year, month - 1, 1));
    const { start, end } = cardCycleRange(card.closingDay, ref);

    // Saldo devedor = total do ciclo − já pago. Base para o default (pagar tudo
    // que falta) e para o teto (não aceitar pagar mais do que se deve).
    const { total: cycleTotal } =
      await this.transactionsRepository.getCardSummary(
        userIds,
        cardId,
        start.toISOString(),
        end.toISOString(),
      );
    const alreadyPaid = await this.invoicePaymentRepository.sumByCycle(
      cardId,
      input.cycle,
      userIds,
    );
    const outstanding = Math.round((cycleTotal - alreadyPaid) * 100) / 100;

    if (outstanding <= 0.005) {
      throw new BadRequestException('Esta fatura já está quitada.');
    }

    // amount = informado, ou o saldo devedor inteiro. Clamp ao saldo: pagar mais
    // que o devido distorceria o saldo do usuário e marcaria over-paid.
    const requested = input.amount ?? outstanding;
    if (requested <= 0) {
      throw new BadRequestException('O valor do pagamento deve ser positivo.');
    }
    const amount = Math.min(requested, outstanding);

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
      amount,
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
      amount,
      paidAt,
      transactionId: tx.id,
    });

    // Status final do ciclo: total já calculado; o pago agora é o anterior + este.
    const paid = Math.round((alreadyPaid + amount) * 100) / 100;

    return {
      cycle: input.cycle,
      total: cycleTotal,
      paid,
      amount, // valor efetivamente pago (pode ter sido clampado ao saldo devedor)
      paymentStatus: invoicePaymentStatus(cycleTotal, paid),
    };
  }
}
