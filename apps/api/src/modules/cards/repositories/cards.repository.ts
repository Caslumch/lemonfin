import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    brand?: string;
    limit?: number;
    closingDay: number;
    dueDay?: number;
    userId: string;
  }) {
    return this.prisma.card.create({
      data: {
        name: data.name,
        brand: data.brand,
        limit: data.limit ? new Prisma.Decimal(data.limit) : undefined,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        userId: data.userId,
      },
    });
  }

  async findById(id: string, userIds: string[]) {
    return this.prisma.card.findFirst({
      where: { id, userId: { in: userIds } },
    });
  }

  async findByName(name: string, userIds: string[]) {
    return this.prisma.card.findFirst({
      where: {
        userId: { in: userIds },
        name: { equals: name, mode: 'insensitive' },
      },
    });
  }

  async findMany(userIds: string[]) {
    return this.prisma.card.findMany({
      where: { userId: { in: userIds } },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Gasto (apenas EXPENSE) do CICLO DE FATURA ABERTO de cada cartão informado,
   * indexado por cardId. O ciclo vai do dia do fechamento do mês anterior até o
   * dia anterior ao fechamento do mês atual (corte no closingDay, estilo Nubank)
   * — o mesmo critério de getInvoice.
   *
   * Como cada cartão tem seu próprio closingDay, não há um intervalo único de
   * datas; buscamos as transações da janela máxima possível (~últimos ~62 dias,
   * cobrindo qualquer ciclo aberto) e somamos em memória respeitando o ciclo de
   * cada cartão. Para a escala de um app pessoal (poucos cartões/transações) é
   * barato e evita N queries.
   */
  async getCurrentCycleSpendByCard(
    cards: { id: string; closingDay: number }[],
    userIds: string[],
    now: Date = new Date(),
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    if (cards.length === 0) return result;

    // Limite inferior seguro para a busca: início do ciclo mais antigo possível
    // entre os cartões (o de menor closingDay). Pegamos com folga (2 meses).
    const windowStart = new Date(
      now.getFullYear(),
      now.getMonth() - 2,
      1,
      0,
      0,
      0,
    );

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId: { in: userIds },
        cardId: { in: cards.map((c) => c.id) },
        type: 'EXPENSE',
        date: { gte: windowStart, lte: now },
      },
      select: { cardId: true, amount: true, date: true },
    });

    for (const card of cards) {
      const { start, end } = this.currentCycleRange(card.closingDay, now);
      const spent = transactions
        .filter(
          (tx) => tx.cardId === card.id && tx.date >= start && tx.date <= end,
        )
        .reduce((sum, tx) => sum + tx.amount.toNumber(), 0);
      result[card.id] = spent;
    }

    return result;
  }

  /**
   * Intervalo do ciclo de fatura ABERTO para um closingDay, relativo a `now`.
   * Se hoje já passou do fechamento deste mês, o ciclo aberto é o próximo
   * (fecha mês que vem); senão, é o que fecha neste mês.
   */
  private currentCycleRange(
    closingDay: number,
    now: Date,
  ): { start: Date; end: Date } {
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    // Convenção estilo Nubank: o DIA do fechamento é o corte — uma compra no
    // closingDay já abre o próximo ciclo. Logo, se hoje ainda é ANTES do
    // fechamento deste mês (day < closingDay), o ciclo aberto encerra no
    // fechamento deste mês; do dia do fechamento em diante, já encerra no mês
    // seguinte. O ciclo vai do closingDay (inclusive) ao dia anterior ao próximo
    // closingDay (closingDay - 1, 23:59:59).
    const closesThisMonth = day < closingDay;
    const endMonthOffset = closesThisMonth ? 0 : 1;

    const start = new Date(year, month - 1 + endMonthOffset, closingDay);
    const end = new Date(
      year,
      month + endMonthOffset,
      closingDay - 1,
      23,
      59,
      59,
      999,
    );
    return { start, end };
  }

  async update(
    id: string,
    data: {
      name?: string;
      brand?: string;
      limit?: number;
      closingDay?: number;
      dueDay?: number;
    },
  ) {
    const updateData: Prisma.CardUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.limit !== undefined)
      updateData.limit = new Prisma.Decimal(data.limit);
    if (data.closingDay !== undefined) updateData.closingDay = data.closingDay;
    if (data.dueDay !== undefined) updateData.dueDay = data.dueDay;

    return this.prisma.card.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    return this.prisma.card.delete({
      where: { id },
    });
  }

  // Retorna a fatura INTEIRA do ciclo (sem paginação) de propósito: é o gasto de
  // um mês de um único cartão — poucas dezenas de linhas no caso real. Trazer
  // tudo de uma vez permite ordenar no cliente (instantâneo, sem nova request a
  // cada troca de critério). Se algum dia uma fatura puder ter centenas/milhares
  // de transações, reconsiderar: aí o caminho é paginar AQUI com orderBy +
  // skip/take (ordenação e paginação acopladas, senão ordena só a fatia trazida).
  async getInvoice(
    cardId: string,
    userIds: string[],
    startDate: Date,
    endDate: Date,
  ) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId: { in: userIds },
        cardId,
        date: { gte: startDate, lte: endDate },
      },
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    const total = transactions.reduce(
      (sum, tx) => sum + tx.amount.toNumber(),
      0,
    );

    return { transactions, total };
  }
}
