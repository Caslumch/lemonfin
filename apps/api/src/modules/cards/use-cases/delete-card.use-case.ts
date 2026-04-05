import { Injectable, NotFoundException } from '@nestjs/common';
import { CardsRepository } from '../repositories/cards.repository';

@Injectable()
export class DeleteCardUseCase {
  constructor(private readonly cardsRepository: CardsRepository) {}

  async execute(id: string, userId: string) {
    const card = await this.cardsRepository.findById(id, userId);
    if (!card) {
      throw new NotFoundException('Cartao nao encontrado');
    }

    await this.cardsRepository.delete(id);
    return { message: 'Cartao removido com sucesso' };
  }
}
