import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';

@Injectable()
export class DeleteTransactionUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  async execute(id: string, userId: string) {
    const transaction = await this.transactionsRepository.findById(id, userId);
    if (!transaction) {
      throw new NotFoundException('Transacao nao encontrada');
    }

    await this.transactionsRepository.delete(id);
    return { message: 'Transacao removida com sucesso' };
  }
}
