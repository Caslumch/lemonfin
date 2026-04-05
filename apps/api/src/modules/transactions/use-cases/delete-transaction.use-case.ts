import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class DeleteTransactionUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(id: string, userId: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const transaction = await this.transactionsRepository.findById(id, userIds);
    if (!transaction) {
      throw new NotFoundException('Transacao nao encontrada');
    }

    await this.transactionsRepository.delete(id);
    return { message: 'Transacao removida com sucesso' };
  }
}
