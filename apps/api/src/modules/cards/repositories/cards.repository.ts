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
