import { Injectable, NotFoundException } from '@nestjs/common';
import { CardsRepository } from '../repositories/cards.repository';
import { InvoiceReconciliationRepository } from '../repositories/invoice-reconciliation.repository';
import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { FamilyContextService } from '../../families/services/family-context.service';
import { cardCycleRange } from '../utils/card-cycle';

const ADJUSTMENT_CATEGORY_SLUG = 'ajuste-fatura';

export type ReconcileResult =
  | { status: 'matched'; appTotal: number; informedTotal: number }
  | {
      status: 'adjusted';
      appTotal: number;
      informedTotal: number;
      difference: number;
      adjustmentId: string;
    }
  | {
      status: 'over';
      appTotal: number;
      informedTotal: number;
      difference: number; // quanto o app tem A MAIS (positivo)
    };

/**
 * Confere a fatura FECHADA contra o total real informado pelo usuário (o app não
 * tem conexão bancária). Compara o total do ciclo no app com o informado:
 * - FALTA (app < informado): cria UMA transação de ajuste (categoria
 *   'ajuste-fatura', data = fim do ciclo) com a diferença → status 'adjusted'.
 * - SOBRA (app > informado): NÃO cria nada, só avisa → status 'over' (lançar um
 *   ajuste negativo bagunçaria; provável duplicata a conferir).
 * - BATE: status 'matched'.
 * Em todos os casos grava o registro de conferência (selo "conferida").
 */
@Injectable()
export class ReconcileInvoiceUseCase {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly reconciliationRepository: InvoiceReconciliationRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(
    cardId: string,
    userId: string,
    input: { cycle: string; informedTotal: number },
  ): Promise<ReconcileResult> {
    const userIds = await this.familyContext.resolveUserIds(userId);

    const card = await this.cardsRepository.findById(cardId, userIds);
    if (!card) {
      throw new NotFoundException('Cartao nao encontrado');
    }

    // Ciclo do "YYYY-MM" informado (mesma régua de getInvoice, em UTC).
    const [year, month] = input.cycle.split('-').map(Number);
    const ref = new Date(Date.UTC(year, month - 1, 1));
    const { end } = cardCycleRange(card.closingDay, ref);

    // Total ATUAL do ciclo no app (só EXPENSE, mesmo critério da fatura).
    const { total: appTotal } =
      await this.transactionsRepository.getCardSummary(
        userIds,
        cardId,
        cardCycleRange(card.closingDay, ref).start.toISOString(),
        end.toISOString(),
      );

    const informed = Math.round(input.informedTotal * 100) / 100;
    const difference = Math.round((informed - appTotal) * 100) / 100;

    // Bate (tolerância de centavo).
    if (Math.abs(difference) <= 0.005) {
      await this.reconciliationRepository.upsert({
        userId,
        cardId,
        cycle: input.cycle,
        informedTotal: informed,
        adjustmentId: null,
      });
      return { status: 'matched', appTotal, informedTotal: informed };
    }

    // App tem A MAIS: não cria ajuste, só avisa (provável duplicata).
    if (difference < 0) {
      await this.reconciliationRepository.upsert({
        userId,
        cardId,
        cycle: input.cycle,
        informedTotal: informed,
        adjustmentId: null,
      });
      return {
        status: 'over',
        appTotal,
        informedTotal: informed,
        difference: -difference, // positivo = quanto tem a mais
      };
    }

    // FALTA: cria a transação de ajuste com a diferença.
    const category = await this.categoriesRepository.findBySlug(
      ADJUSTMENT_CATEGORY_SLUG,
    );
    if (!category) {
      throw new NotFoundException(
        'Categoria "Ajuste de fatura" nao encontrada (rode o seed).',
      );
    }

    // Data = fim do ciclo, ao meio-dia UTC (convenção do projeto), para o ajuste
    // cair DENTRO do ciclo conferido.
    const adjustDate = new Date(
      Date.UTC(
        end.getUTCFullYear(),
        end.getUTCMonth(),
        end.getUTCDate(),
        12,
        0,
        0,
      ),
    );

    const monthLabel = ref.toLocaleDateString('pt-BR', {
      month: 'long',
      timeZone: 'UTC',
    });

    const tx = await this.transactionsRepository.create({
      amount: difference,
      type: 'EXPENSE',
      description: `Ajuste fatura ${card.name} — ${monthLabel}`,
      date: adjustDate.toISOString(),
      source: 'MANUAL',
      userId,
      categoryId: category.id,
      cardId, // ajuste É gasto no cartão (compõe a fatura)
    });

    await this.reconciliationRepository.upsert({
      userId,
      cardId,
      cycle: input.cycle,
      informedTotal: informed,
      adjustmentId: tx.id,
    });

    return {
      status: 'adjusted',
      appTotal,
      informedTotal: informed,
      difference,
      adjustmentId: tx.id,
    };
  }
}
