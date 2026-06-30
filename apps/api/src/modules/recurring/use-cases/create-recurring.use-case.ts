import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { RecurringRepository } from '../repositories/recurring.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { CreateRecurringInput } from '../dtos/recurring.dto';

@Injectable()
export class CreateRecurringUseCase {
  constructor(
    private readonly recurringRepository: RecurringRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(userId: string, input: CreateRecurringInput) {
    const userIds = await this.familyContext.resolveUserIds(userId);

    // Escopa a categoria ao chamador (sistema ou da família) — fecha o IDOR de
    // criar uma recorrente sobre uma categoria privada de outra família.
    const category = await this.categoriesRepository.findAccessible(
      input.categoryId,
      userIds,
    );
    if (!category) {
      throw new NotFoundException('Categoria nao encontrada');
    }

    if (input.cardId) {
      const card = await this.cardsRepository.findById(input.cardId, userIds);
      if (!card) {
        throw new NotFoundException('Cartao nao encontrado');
      }
    }

    return this.recurringRepository.create({ ...input, userId });
  }
}
