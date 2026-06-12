import { Injectable, NotFoundException } from '@nestjs/common';
import { RecurringRepository } from '../repositories/recurring.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { UpdateRecurringInput } from '../dtos/recurring.dto';

@Injectable()
export class UpdateRecurringUseCase {
  constructor(
    private readonly recurringRepository: RecurringRepository,
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(id: string, userId: string, input: UpdateRecurringInput) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const recurring = await this.recurringRepository.findById(id, userIds);
    if (!recurring) {
      throw new NotFoundException('Recorrencia nao encontrada');
    }

    // Se está (re)vinculando a um cartão, valida ownership. `null` = desvincular
    // (legítimo), então só checamos quando cardId é uma string. Sem isso, o
    // `connect` do Prisma aceitaria o cartão de outro usuário/família (IDOR).
    if (typeof input.cardId === 'string') {
      const card = await this.cardsRepository.findById(input.cardId, userIds);
      if (!card) {
        throw new NotFoundException('Cartao nao encontrado');
      }
    }

    return this.recurringRepository.update(id, input);
  }
}
