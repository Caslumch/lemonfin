import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { UpdateTransactionInput } from '../dtos/transaction.dto';

@Injectable()
export class UpdateTransactionUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(id: string, userId: string, input: UpdateTransactionInput) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const transaction = await this.transactionsRepository.findById(id, userIds);
    if (!transaction) {
      throw new NotFoundException('Transacao nao encontrada');
    }

    // Se está (re)vinculando a um cartão, valida ownership. `null` = desvincular
    // (legítimo), então só checamos quando cardId é uma string.
    if (typeof input.cardId === 'string') {
      const card = await this.cardsRepository.findById(input.cardId, userIds);
      if (!card) {
        throw new NotFoundException('Cartao nao encontrado');
      }
    }

    return this.transactionsRepository.update(id, input);
  }
}
