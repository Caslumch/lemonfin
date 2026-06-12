import { Injectable } from '@nestjs/common';
import { CardsRepository } from '../repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class ListCardsUseCase {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const cards = await this.cardsRepository.findMany(userIds);

    // Anexa o gasto do ciclo de fatura aberto de cada cartão (para a barra de
    // uso do limite no front). Uma única consulta agregada para todos.
    const spendByCard = await this.cardsRepository.getCurrentCycleSpendByCard(
      cards.map((c) => ({ id: c.id, closingDay: c.closingDay })),
      userIds,
    );

    return cards.map((card) => ({
      ...card,
      currentSpend: spendByCard[card.id] ?? 0,
    }));
  }
}
