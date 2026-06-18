import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const recurringInclude = {
  category: true,
  card: { select: { id: true, name: true } },
} as const;

@Injectable()
export class RecurringRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    description: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    dayOfMonth: number;
    userId: string;
    categoryId: string;
    cardId?: string;
  }) {
    return this.prisma.recurringTransaction.create({
      data: {
        description: data.description,
        amount: new Prisma.Decimal(data.amount),
        type: data.type,
        dayOfMonth: data.dayOfMonth,
        userId: data.userId,
        categoryId: data.categoryId,
        cardId: data.cardId,
      },
      include: recurringInclude,
    });
  }

  async findById(id: string, userIds: string[]) {
    return this.prisma.recurringTransaction.findFirst({
      where: { id, userId: { in: userIds } },
      include: recurringInclude,
    });
  }

  async findMany(userIds: string[], activeOnly = false) {
    return this.prisma.recurringTransaction.findMany({
      where: {
        userId: { in: userIds },
        ...(activeOnly && { active: true }),
      },
      include: recurringInclude,
      orderBy: { dayOfMonth: 'asc' },
    });
  }

  // Versão paginada usada pela listagem da tela web (GET /recurring).
  async findManyPaginated(
    userIds: string[],
    options: { skip: number; take: number; activeOnly?: boolean },
  ) {
    const where: Prisma.RecurringTransactionWhereInput = {
      userId: { in: userIds },
      ...(options.activeOnly && { active: true }),
    };

    // Totais mensais (ativas) agregados sobre TODA a coleção — não só a página —
    // para os cards de resumo da tela ficarem corretos com paginação.
    const activeWhere: Prisma.RecurringTransactionWhereInput = {
      ...where,
      active: true,
    };

    const [data, total, expenseAgg, incomeAgg] = await Promise.all([
      this.prisma.recurringTransaction.findMany({
        where,
        include: recurringInclude,
        orderBy: { dayOfMonth: 'asc' },
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.recurringTransaction.count({ where }),
      this.prisma.recurringTransaction.aggregate({
        where: { ...activeWhere, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
      this.prisma.recurringTransaction.aggregate({
        where: { ...activeWhere, type: 'INCOME' },
        _sum: { amount: true },
      }),
    ]);

    return {
      data,
      total,
      monthlyExpense: expenseAgg._sum.amount?.toNumber() ?? 0,
      monthlyIncome: incomeAgg._sum.amount?.toNumber() ?? 0,
    };
  }

  // All active recurrences that should be materialized on the given day-of-month.
  // Used by the materialization cron.
  async findActiveForDay(dayOfMonth: number) {
    return this.prisma.recurringTransaction.findMany({
      where: { active: true, dayOfMonth },
      include: recurringInclude,
    });
  }

  async update(
    id: string,
    data: {
      description?: string;
      amount?: number;
      type?: 'INCOME' | 'EXPENSE';
      dayOfMonth?: number;
      categoryId?: string;
      cardId?: string | null;
      active?: boolean;
    },
  ) {
    const updateData: Prisma.RecurringTransactionUpdateInput = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined)
      updateData.amount = new Prisma.Decimal(data.amount);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.dayOfMonth !== undefined) updateData.dayOfMonth = data.dayOfMonth;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.categoryId !== undefined)
      updateData.category = { connect: { id: data.categoryId } };
    if (data.cardId === null) updateData.card = { disconnect: true };
    else if (data.cardId !== undefined)
      updateData.card = { connect: { id: data.cardId } };

    return this.prisma.recurringTransaction.update({
      where: { id },
      data: updateData,
      include: recurringInclude,
    });
  }

  async delete(id: string) {
    return this.prisma.recurringTransaction.delete({ where: { id } });
  }

  // Has this recurrence already produced a transaction within [start, end]?
  // Guarantees idempotent materialization (cron can re-run safely).
  async hasMaterializedBetween(recurringId: string, start: Date, end: Date) {
    const existing = await this.prisma.transaction.findFirst({
      where: { recurringId, date: { gte: start, lte: end } },
      select: { id: true },
    });
    return existing !== null;
  }
}
