import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { CardsRepository } from '../../cards/repositories/cards.repository';
import { FamilyContextService } from '../../families/services/family-context.service';

@Injectable()
export class GetSummaryUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly cardsRepository: CardsRepository,
    private readonly familyContext: FamilyContextService,
  ) {}

  async execute(userId: string, startDate?: string, endDate?: string) {
    const userIds = await this.familyContext.resolveUserIds(userId);
    const summary = await this.transactionsRepository.getSummary(
      userIds,
      startDate,
      endDate,
    );

    // "Fatura cartão" reflete o CICLO DE FECHAMENTO de cada cartão (o mesmo
    // número da tela /cartoes) — é a fatura do ciclo. Isso é DIFERENTE de
    // `cardExpense` (gasto no cartão dentro do mês civil, vindo do getSummary):
    // a fatura mistura ciclos que atravessam a virada do mês. Expomos os DOIS:
    //  - cardInvoice: fatura do ciclo → card "Fatura cartão".
    //  - cardExpense (do summary): gasto no cartão no mês → compõe "Gastos do mês".
    //
    // A fatura acompanha o MÊS SELECIONADO (startDate), não sempre o mês atual —
    // senão, ao navegar para um mês passado na tela de Transações, os demais
    // cards mostram o mês escolhido e a "Fatura cartão" ficava travada no ciclo
    // corrente. Sem startDate (all-time), cai no mês atual.
    // Ref = meio do mês selecionado (dia 15 UTC). O startDate vem como o 1º do
    // mês em horário BR; ancorar no dia 15 evita que qualquer deslocamento de
    // fuso na borda jogue a referência para o mês vizinho.
    const ref = startDate
      ? new Date(
          Date.UTC(
            new Date(startDate).getUTCFullYear(),
            new Date(startDate).getUTCMonth(),
            15,
          ),
        )
      : new Date();
    const cards = await this.cardsRepository.findMany(userIds);
    const spendByCard = await this.cardsRepository.getCurrentCycleSpendByCard(
      cards.map((c) => ({ id: c.id, closingDay: c.closingDay })),
      userIds,
      ref,
    );
    const cardInvoice = Object.values(spendByCard).reduce((s, v) => s + v, 0);

    return { ...summary, cardInvoice };
  }
}
