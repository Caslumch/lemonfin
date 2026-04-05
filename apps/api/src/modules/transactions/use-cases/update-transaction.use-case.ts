import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { UpdateTransactionInput } from '../dtos/transaction.dto';

@Injectable()
export class UpdateTransactionUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  async execute(id: string, userId: string, input: UpdateTransactionInput) {
    const transaction = await this.transactionsRepository.findById(id, userId);
    if (!transaction) {
      throw new NotFoundException('Transacao nao encontrada');
    }

    return this.transactionsRepository.update(id, input);
  }
}
