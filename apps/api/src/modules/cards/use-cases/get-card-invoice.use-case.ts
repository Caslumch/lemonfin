import { Injectable, NotFoundException } from '@nestjs/common';
import { CardsRepository } from '../repositories/cards.repository';
import { InvoicePaymentRepository } from '../repositories/invoice-payment.repository';
import { InvoiceReconciliationRepository } from '../repositories/invoice-reconciliation.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import {
  cardCycleRange,
  invoicePaymentStatus,
  invoiceCycleState,
  nextDueDate,
} from '../utils/card-cycle';
import type { InvoiceQuery } from '../dtos/card.dto';

@Injectable()
export class GetCardInvoiceUseCase {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly invoicePaymentRepository: InvoicePaymentRepository,
    private readonly reconciliationRepository: InvoiceReconciliationRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(cardId: string, userId: string, query: InvoiceQuery) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const card = await this.cardsRepository.findById(cardId, userIds);
    if (!card) {
      throw new NotFoundException('Cartao nao encontrado');
    }

    const now = new Date();
    let year = now.getUTCFullYear();
    let monthIndex = now.getUTCMonth();

    if (query.month) {
      const [y, m] = query.month.split('-').map(Number);
      year = y;
      monthIndex = m - 1;
    }

    // Ciclo de fatura — ver cardCycleRange (fonte única, convenção estilo Nubank).
    // ref em UTC para casar com a régua (que opera em UTC, igual à gravação noon-UTC).
    const { start: startDate, end: endDate } = cardCycleRange(
      card.closingDay,
      new Date(Date.UTC(year, monthIndex, 1)),
    );

    const skip = (query.page - 1) * query.perPage;
    const { transactions, total, count } =
      await this.cardsRepository.getInvoice(
        cardId,
        userIds,
        startDate,
        endDate,
        {
          skip,
          take: query.perPage,
          search: query.search,
          categoryId: query.categoryId,
          installment: query.installment,
          orderBy: query.orderBy,
          order: query.order,
        },
      );

    const cycle = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    // Status de pagamento do ciclo. `paid` = soma dos InvoicePayment do ciclo.
    // Derivamos o status contra o total da fatura. Nota: quando há filtros
    // ativos (busca/categoria), `total` reflete só o subconjunto filtrado; o
    // status é uma propriedade da fatura inteira, então só é exato sem filtros
    // — que é o caso do selo na UI (o selo é exibido sem filtros aplicados).
    const paid = await this.invoicePaymentRepository.sumByCycle(
      cardId,
      cycle,
      userIds,
    );
    const payments = await this.invoicePaymentRepository.findByCardCycle(
      cardId,
      cycle,
      userIds,
    );

    const isClosed = now > endDate;

    // Estado de CICLO (futura/aberta/fechada/parcial/paga) — base do badge e da
    // liberação do botão "Pagar fatura" no front. closeDate/dueDate vão prontas
    // (ISO, meio-dia UTC p/ dueDate) para o front exibir sem reimplementar a
    // régua de ciclo (que em horário local seria frágil).
    const cycleState = invoiceCycleState({
      total,
      paid,
      start: startDate,
      end: endDate,
      now,
    });
    const dueDate =
      card.dueDay != null
        ? nextDueDate(card.dueDay, endDate).toISOString()
        : null;

    // Conferência do ciclo (selo "conferida" + total informado), se já houve.
    const rec = await this.reconciliationRepository.findByCardCycle(
      cardId,
      cycle,
      userIds,
    );
    const reconciliation = rec
      ? {
          informedTotal: rec.informedTotal.toNumber(),
          reconciledAt: rec.reconciledAt.toISOString(),
          hasAdjustment: rec.adjustmentId != null,
        }
      : null;

    return {
      card,
      month: cycle,
      transactions,
      // total = soma do ciclo FILTRADO inteiro (não só a página)
      total,
      isClosed,
      cycleState,
      closeDate: endDate.toISOString(),
      dueDate,
      paid,
      paymentStatus: invoicePaymentStatus(total, paid),
      // null = ainda não conferida; objeto = conferida (base do selo na UI).
      reconciliation,
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount.toNumber(),
        paidAt: p.paidAt.toISOString(),
      })),
      meta: {
        total: count,
        page: query.page,
        perPage: query.perPage,
        totalPages: Math.ceil(count / query.perPage),
      },
    };
  }
}
