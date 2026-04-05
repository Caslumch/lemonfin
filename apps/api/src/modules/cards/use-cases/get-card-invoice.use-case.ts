import { Injectable, NotFoundException } from '@nestjs/common';
import { CardsRepository } from '../repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class GetCardInvoiceUseCase {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(cardId: string, userId: string, month?: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const card = await this.cardsRepository.findById(cardId, userIds);
    if (!card) {
      throw new NotFoundException('Cartao nao encontrado');
    }

    const now = new Date();
    let year = now.getFullYear();
    let monthIndex = now.getMonth();

    if (month) {
      const [y, m] = month.split('-').map(Number);
      year = y;
      monthIndex = m - 1;
    }

    // Billing cycle: from closingDay of previous month to closingDay of current month
    const closingDay = card.closingDay;
    const startDate = new Date(year, monthIndex - 1, closingDay + 1);
    const endDate = new Date(year, monthIndex, closingDay, 23, 59, 59);

    const { transactions, total } = await this.cardsRepository.getInvoice(
      cardId,
      userIds,
      startDate,
      endDate,
    );

    return {
      card,
      month: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      transactions,
      total,
      isClosed: now > endDate,
    };
  }
}
