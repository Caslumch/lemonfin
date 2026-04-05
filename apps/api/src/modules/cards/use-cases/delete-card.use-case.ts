import { Injectable, NotFoundException } from '@nestjs/common';
import { CardsRepository } from '../repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class DeleteCardUseCase {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(id: string, userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const card = await this.cardsRepository.findById(id, userIds);
    if (!card) {
      throw new NotFoundException('Cartao nao encontrado');
    }

    await this.cardsRepository.delete(id);
    return { message: 'Cartao removido com sucesso' };
  }
}
