import { Injectable } from '@nestjs/common';
import { CardsRepository } from '../repositories/cards.repository';
import { CreateCardInput } from '../dtos/card.dto';

@Injectable()
export class CreateCardUseCase {
  constructor(private readonly cardsRepository: CardsRepository) {}

  async execute(userId: string, input: CreateCardInput) {
    return this.cardsRepository.create({ ...input, userId });
  }
}
