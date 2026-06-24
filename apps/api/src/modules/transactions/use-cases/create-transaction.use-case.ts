import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { CreateTransactionInput } from '../dtos/transaction.dto';
import { CreateInstallmentsUseCase } from './create-installments.use-case';

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
    private readonly createInstallmentsUseCase: CreateInstallmentsUseCase,
  ) {}

  async execute(userId: string, input: CreateTransactionInput) {
    // Compra parcelada: delega ao use-case dedicado (que cria N transações
    // vinculadas pelo mesmo grupo, a partir da data informada). Parcelar só faz
    // sentido para despesa.
    if (input.installments && input.installments >= 2) {
      if (input.type !== 'EXPENSE') {
        throw new BadRequestException(
          'Só é possível parcelar despesas (EXPENSE).',
        );
      }
      const { installmentGroupId, transactionIds } =
        await this.createInstallmentsUseCase.execute({
          amount: input.amount, // valor TOTAL da compra
          installments: input.installments,
          description: input.description ?? '',
          userId,
          categoryId: input.categoryId,
          cardId: input.cardId,
          startDate: input.date, // data da compra = 1ª parcela
          source: 'MANUAL',
        });
      return { installmentGroupId, count: transactionIds.length };
    }

    const category = await this.categoriesRepository.findById(input.categoryId);
    if (!category) {
      throw new NotFoundException('Categoria nao encontrada');
    }

    // Valida ownership do cartão: sem isso, o `connect` do Prisma vincularia a
    // transação a um cartão de outro usuário/família (IDOR de escrita).
    if (input.cardId) {
      const userIds = await this.familyContext.resolveUserIds(userId);
      const card = await this.cardsRepository.findById(input.cardId, userIds);
      if (!card) {
        throw new NotFoundException('Cartao nao encontrado');
      }
    }

    // `installments` não é coluna da transação avulsa — não repassa ao repo.
    return this.transactionsRepository.create({
      amount: input.amount,
      type: input.type,
      description: input.description,
      date: input.date,
      categoryId: input.categoryId,
      cardId: input.cardId,
      userId,
    });
  }
}
