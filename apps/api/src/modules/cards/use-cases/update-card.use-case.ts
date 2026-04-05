import { Injectable, NotFoundException } from '@nestjs/common';
import { CardsRepository } from '../repositories/cards.repository';
import { UpdateCardInput } from '../dtos/card.dto';

@Injectable()
export class UpdateCardUseCase {
  constructor(private readonly cardsRepository: CardsRepository) {}

  async execute(id: string, userId: string, input: UpdateCardInput) {
    const card = await this.cardsRepository.findById(id, userId);
    if (!card) {
      throw new NotFoundException('Cartao nao encontrado');
    }

    return this.cardsRepository.update(id, input);
  }
}
