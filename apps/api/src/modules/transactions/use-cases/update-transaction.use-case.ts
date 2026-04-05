import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { UpdateTransactionInput } from '../dtos/transaction.dto';

@Injectable()
export class UpdateTransactionUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(id: string, userId: string, input: UpdateTransactionInput) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const transaction = await this.transactionsRepository.findById(id, userIds);
    if (!transaction) {
      throw new NotFoundException('Transacao nao encontrada');
    }

    return this.transactionsRepository.update(id, input);
  }
}
