import { Injectable, NotFoundException } from '@nestjs/common';
import { CardsRepository } from '../repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { UpdateCardInput } from '../dtos/card.dto';

@Injectable()
export class UpdateCardUseCase {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(id: string, userId: string, input: UpdateCardInput) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const card = await this.cardsRepository.findById(id, userIds);
    if (!card) {
      throw new NotFoundException('Cartao nao encontrado');
    }

    return this.cardsRepository.update(id, input);
  }
}
