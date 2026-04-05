import { Injectable } from '@nestjs/common';
import { CardsRepository } from '../repositories/cards.repository';

@Injectable()
export class ListCardsUseCase {
  constructor(private readonly cardsRepository: CardsRepository) {}

  async execute(userId: string) {
    return this.cardsRepository.findMany(userId);
  }
}
