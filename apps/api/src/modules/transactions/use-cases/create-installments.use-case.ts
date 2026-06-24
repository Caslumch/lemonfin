import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { TransactionsRepository } from '../repositories/transactions.repository';

interface CreateInstallmentsParams {
  amount: number; // valor TOTAL da compra (será dividido nas parcelas)
  installments: number; // número de parcelas (>= 2)
  description: string;
  userId: string;
  categoryId: string;
  cardId?: string;
  // Data da compra = data da 1ª parcela. Cada parcela seguinte cai +1 mês.
  // Aceita data no passado (compra retroativa). Ausente = hoje.
  startDate?: string | Date;
  source?: 'WHATSAPP' | 'MANUAL';
}

export interface CreateInstallmentsResult {
  perInstallment: number;
  installmentGroupId: string;
  transactionIds: string[];
}

@Injectable()
export class CreateInstallmentsUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  // Cria as N parcelas de uma compra: vincula todas pelo mesmo grupo (permite
  // excluir o grupo inteiro depois), uma por mês a partir da data da compra
  // (startDate). Retorna o valor de cada parcela, o grupo e os ids criados
  // (para a mensagem do WhatsApp e para registrar a "última ação").
  async execute(
    params: CreateInstallmentsParams,
  ): Promise<CreateInstallmentsResult> {
    const category = await this.categoriesRepository.findById(
      params.categoryId,
    );
    if (!category) {
      throw new NotFoundException('Categoria nao encontrada');
    }

    // Valida ownership do cartão (mesmo motivo de create-transaction: evita IDOR
    // de escrita vinculando a um cartão de outro usuário/família).
    if (params.cardId) {
      const userIds = await this.familyContext.resolveUserIds(params.userId);
      const card = await this.cardsRepository.findById(params.cardId, userIds);
      if (!card) {
        throw new NotFoundException('Cartao nao encontrado');
      }
    }

    const perInstallment =
      Math.round((params.amount / params.installments) * 100) / 100;
    const base = params.startDate ? new Date(params.startDate) : new Date();
    const installmentGroupId = randomUUID();
    const transactionIds: string[] = [];

    const baseYear = base.getFullYear();
    const baseMonth = base.getMonth();
    const baseDay = base.getDate();

    for (let i = 0; i < params.installments; i++) {
      // Fixa o dia no último dia válido do mês-alvo. Sem isso, new Date(ano,
      // mês+i, 31) "vaza" para o mês seguinte (ex: 31/jan + 1 mês → 03/mar),
      // pulando meses e bagunçando o cronograma das parcelas.
      const lastDayOfTargetMonth = new Date(
        baseYear,
        baseMonth + i + 1,
        0,
      ).getDate();
      const day = Math.min(baseDay, lastDayOfTargetMonth);
      const installmentDate = new Date(baseYear, baseMonth + i, day);

      const tx = await this.transactionsRepository.create({
        amount: perInstallment,
        type: 'EXPENSE',
        description: `${params.description} (${i + 1}/${params.installments})`,
        date: installmentDate.toISOString(),
        source: params.source ?? 'MANUAL',
        userId: params.userId,
        categoryId: params.categoryId,
        cardId: params.cardId,
        installmentGroupId,
        installmentNumber: i + 1,
        installmentTotal: params.installments,
      });
      transactionIds.push(tx.id);
    }

    return { perInstallment, installmentGroupId, transactionIds };
  }
}
