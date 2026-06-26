import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class GetSummaryUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(userId: string, startDate?: string, endDate?: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const summary = await this.transactionsRepository.getSummary(
      userIds,
      startDate,
      endDate,
    );

    // "Fatura cartão" deve refletir o CICLO DE FECHAMENTO de cada cartão (o
    // mesmo número da tela /cartoes), não o gasto no mês civil. Recalcula aqui
    // somando a fatura aberta de todos os cartões do usuário/família.
    const cards = await this.cardsRepository.findMany(userIds);
    const spendByCard = await this.cardsRepository.getCurrentCycleSpendByCard(
      cards.map((c) => ({ id: c.id, closingDay: c.closingDay })),
      userIds,
    );
    const cardExpense = Object.values(spendByCard).reduce((s, v) => s + v, 0);

    return { ...summary, cardExpense };
  }
}
