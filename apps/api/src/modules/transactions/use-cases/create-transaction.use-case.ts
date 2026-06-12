import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { CreateTransactionInput } from '../dtos/transaction.dto';

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(userId: string, input: CreateTransactionInput) {
    const category = await this.categoriesRepository.findById(input.categoryId);
    if (!category) {
      throw new NotFoundException('Categoria nao encontrada');
    }

    // Valida ownership do cartão: sem isso, o `connect` do Prisma vincularia a
    // transação a um cartão de outro usuário/família (IDOR de escrita).
    if (input.cardId) {
      const userIds = await this.familyContext.resolveUserIds(userId);
      const card = await this.cardsRepository.findById(input.cardId, userIds);
      if (!card) {
        throw new NotFoundException('Cartao nao encontrado');
      }
    }

    return this.transactionsRepository.create({
      ...input,
      userId,
    });
  }
}
