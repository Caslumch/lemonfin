import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class DeleteTransactionUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(
    id: string,
    userId: string,
    scope: 'single' | 'group' = 'single',
  ) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const transaction = await this.transactionsRepository.findById(id, userIds);
    if (!transaction) {
      throw new NotFoundException('Transacao nao encontrada');
    }

    // Exclusão do grupo inteiro de parcelas: só quando pedido E a transação
    // realmente pertence a um grupo. Caso contrário, cai no delete individual.
    if (scope === 'group' && transaction.installmentGroupId) {
      const count = await this.transactionsRepository.deleteByInstallmentGroup(
        transaction.installmentGroupId,
        userIds,
      );
      return {
        message: `${count} ${count === 1 ? 'parcela removida' : 'parcelas removidas'} com sucesso`,
        deletedCount: count,
      };
    }

    await this.transactionsRepository.delete(id);
    return { message: 'Transacao removida com sucesso', deletedCount: 1 };
  }
}
