import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { UpdateInstallmentGroupInput } from '../dtos/transaction.dto';
import { buildInstallmentSchedule } from './create-installments.use-case';

@Injectable()
export class UpdateInstallmentGroupUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  // Edita uma compra parcelada inteira: a partir de QUALQUER parcela do grupo,
  // apaga todas as parcelas atuais e recria o cronograma (novo valor total, nº
  // de parcelas e data da 1ª), preservando o mesmo installmentGroupId. Tudo
  // numa transação no repositório (sem estado parcial se algo falhar).
  async execute(id: string, userId: string, input: UpdateInstallmentGroupInput) {
    const userIds = await this.familyContext.resolveUserIds(userId);

    // A transação informada precisa existir, pertencer ao usuário/família e
    // fazer parte de um grupo de parcelas — senão não há grupo para editar.
    const transaction = await this.transactionsRepository.findById(id, userIds);
    if (!transaction) {
      throw new NotFoundException('Transacao nao encontrada');
    }
    if (!transaction.installmentGroupId) {
      throw new BadRequestException(
        'Esta transacao nao faz parte de uma compra parcelada.',
      );
    }

    const category = await this.categoriesRepository.findById(input.categoryId);
    if (!category) {
      throw new NotFoundException('Categoria nao encontrada');
    }

    // Valida ownership do cartão (mesmo motivo do create: evita IDOR de escrita
    // vinculando a um cartão de outro usuário/família). `null`/ausente = sem cartão.
    const cardId =
      typeof input.cardId === 'string' ? input.cardId : undefined;
    if (cardId) {
      const card = await this.cardsRepository.findById(cardId, userIds);
      if (!card) {
        throw new NotFoundException('Cartao nao encontrado');
      }
    }

    const { perInstallment, dates } = buildInstallmentSchedule({
      amount: input.amount, // valor TOTAL da compra
      installments: input.installments,
      startDate: input.date, // data da 1ª parcela
    });
    const description = input.description ?? '';

    const rows = dates.map((date, i) => ({
      amount: perInstallment,
      description: `${description} (${i + 1}/${input.installments})`,
      date,
      source: 'MANUAL' as const,
      userId: transaction.userId, // mantém o dono original das parcelas
      categoryId: input.categoryId,
      cardId,
      installmentNumber: i + 1,
      installmentTotal: input.installments,
    }));

    const created = await this.transactionsRepository.replaceInstallmentGroup(
      transaction.installmentGroupId,
      userIds,
      rows,
    );

    return {
      installmentGroupId: transaction.installmentGroupId,
      count: created.count,
      perInstallment,
    };
  }
}
