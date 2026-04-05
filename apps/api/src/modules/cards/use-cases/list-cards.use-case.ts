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
    return this.cardsRepository.findMany(userIds);
  }
}
