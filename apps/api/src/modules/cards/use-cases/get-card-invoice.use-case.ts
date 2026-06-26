import { Injectable, NotFoundException } from '@nestjs/common';
import { CardsRepository } from '../repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { cardCycleRange } from '../utils/card-cycle';
import type { InvoiceQuery } from '../dtos/card.dto';

@Injectable()
export class GetCardInvoiceUseCase {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(cardId: string, userId: string, query: InvoiceQuery) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const card = await this.cardsRepository.findById(cardId, userIds);
    if (!card) {
      throw new NotFoundException('Cartao nao encontrado');
    }

    const now = new Date();
    let year = now.getFullYear();
    let monthIndex = now.getMonth();

    if (query.month) {
      const [y, m] = query.month.split('-').map(Number);
      year = y;
      monthIndex = m - 1;
    }

    // Ciclo de fatura — ver cardCycleRange (fonte única, convenção estilo Nubank).
    const { start: startDate, end: endDate } = cardCycleRange(
      card.closingDay,
      new Date(year, monthIndex, 1),
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

    return {
      card,
      month: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      transactions,
      // total = soma do ciclo FILTRADO inteiro (não só a página)
      total,
      isClosed: now > endDate,
      meta: {
        total: count,
        page: query.page,
        perPage: query.perPage,
        totalPages: Math.ceil(count / query.perPage),
      },
    };
  }
}
