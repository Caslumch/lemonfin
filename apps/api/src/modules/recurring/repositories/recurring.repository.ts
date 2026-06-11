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
