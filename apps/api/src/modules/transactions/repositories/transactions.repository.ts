import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

interface FindManyOptions {
  userId: string;
  type?: 'INCOME' | 'EXPENSE';
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
  skip: number;
  take: number;
}

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    description?: string;
    date?: string;
    source?: 'MANUAL' | 'WHATSAPP';
    userId: string;
    categoryId: string;
    cardId?: string;
  }) {
    return this.prisma.transaction.create({
      data: {
        amount: new Prisma.Decimal(data.amount),
        type: data.type,
        description: data.description,
        date: data.date ? new Date(data.date) : new Date(),
        source: data.source ?? 'MANUAL',
        userId: data.userId,
        categoryId: data.categoryId,
        cardId: data.cardId,
      },
      include: { category: true },
    });
  }

  async findById(id: string, userId: string) {
    return this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });
  }

  async findLastByUser(userId: string) {
    return this.prisma.transaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { category: true },
    });
  }

  async findMany(options: FindManyOptions) {
    const where: Prisma.TransactionWhereInput = {
      userId: options.userId,
    };

    if (options.type) where.type = options.type;
    if (options.categoryId) where.categoryId = options.categoryId;
    if (options.startDate || options.endDate) {
      where.date = {};
      if (options.startDate) where.date.gte = new Date(options.startDate);
      if (options.endDate) where.date.lte = new Date(options.endDate);
    }

    const orderBy = { [options.orderBy || 'date']: options.order || 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy,
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: {
      amount?: number;
      type?: 'INCOME' | 'EXPENSE';
      description?: string;
      date?: string;
      categoryId?: string;
      cardId?: string | null;
    },
  ) {
    const updateData: Prisma.TransactionUpdateInput = {};
    if (data.amount !== undefined)
      updateData.amount = new Prisma.Decimal(data.amount);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.categoryId !== undefined)
      updateData.category = { connect: { id: data.categoryId } };
    if (data.cardId === null)
      updateData.card = { disconnect: true };
    else if (data.cardId !== undefined)
      updateData.card = { connect: { id: data.cardId } };

    return this.prisma.transaction.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
  }

  async delete(id: string) {
    return this.prisma.transaction.delete({
      where: { id },
    });
  }

  async getMonthlyBreakdown(userId: string, months: number = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - months + 1);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: since } },
      select: { amount: true, type: true, date: true, cardId: true },
    });

    const map = new Map<string, { income: number; expense: number; cardExpense: number }>();

    // Initialize all months
    for (let i = 0; i < months; i++) {
      const d = new Date(since);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, { income: 0, expense: 0, cardExpense: 0 });
    }

    for (const tx of transactions) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = map.get(key);
      if (entry) {
        if (tx.type === 'INCOME') {
          entry.income += tx.amount.toNumber();
        } else if (tx.cardId) {
          entry.cardExpense += tx.amount.toNumber();
        } else {
          entry.expense += tx.amount.toNumber();
        }
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense + data.cardExpense,
        cardExpense: data.cardExpense,
        balance: data.income - data.expense,
      }));
  }

  async getCategoryBreakdown(userId: string, startDate?: string, endDate?: string) {
    const where: Prisma.TransactionWhereInput = { userId, type: 'EXPENSE' };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const result = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    const categoryIds = result.map((r) => r.categoryId);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });
    const catMap = new Map(categories.map((c) => [c.id, c]));

    return result.map((r) => ({
      categoryId: r.categoryId,
      category: catMap.get(r.categoryId) ?? null,
      total: r._sum.amount?.toNumber() ?? 0,
      count: r._count,
    }));
  }

  async getSummary(userId: string, startDate?: string, endDate?: string) {
    const where: Prisma.TransactionWhereInput = { userId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [income, expenseNoCard, expenseCard] = await this.prisma.$transaction([
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE', cardId: null },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE', cardId: { not: null } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalIncome = income._sum.amount?.toNumber() ?? 0;
    const totalExpenseNoCard = expenseNoCard._sum.amount?.toNumber() ?? 0;
    const totalCardExpense = expenseCard._sum.amount?.toNumber() ?? 0;

    return {
      income: totalIncome,
      expense: totalExpenseNoCard + totalCardExpense,
      cardExpense: totalCardExpense,
      balance: totalIncome - totalExpenseNoCard,
      incomeCount: income._count,
      expenseCount: expenseNoCard._count + expenseCard._count,
    };
  }
}
