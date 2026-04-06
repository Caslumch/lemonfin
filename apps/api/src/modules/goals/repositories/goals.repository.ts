import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const goalInclude = {
  category: true,
} as const;

@Injectable()
export class GoalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    amount: number;
    period: 'MONTHLY' | 'WEEKLY';
    userId: string;
    categoryId: string;
  }) {
    return this.prisma.goal.create({
      data: {
        name: data.name,
        amount: new Prisma.Decimal(data.amount),
        period: data.period,
        userId: data.userId,
        categoryId: data.categoryId,
      },
      include: goalInclude,
    });
  }

  async findById(id: string, userIds: string[]) {
    return this.prisma.goal.findFirst({
      where: { id, userId: { in: userIds } },
      include: goalInclude,
    });
  }

  async findMany(userIds: string[], activeOnly = true) {
    return this.prisma.goal.findMany({
      where: {
        userId: { in: userIds },
        ...(activeOnly && { active: true }),
      },
      include: goalInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCategory(userIds: string[], categoryId: string) {
    return this.prisma.goal.findFirst({
      where: {
        userId: { in: userIds },
        categoryId,
        active: true,
      },
      include: goalInclude,
    });
  }

  async update(id: string, data: {
    name?: string;
    amount?: number;
    period?: 'MONTHLY' | 'WEEKLY';
    active?: boolean;
  }) {
    const updateData: Prisma.GoalUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.amount !== undefined) updateData.amount = new Prisma.Decimal(data.amount);
    if (data.period !== undefined) updateData.period = data.period;
    if (data.active !== undefined) updateData.active = data.active;

    return this.prisma.goal.update({
      where: { id },
      data: updateData,
      include: goalInclude,
    });
  }

  async delete(id: string) {
    return this.prisma.goal.delete({ where: { id } });
  }
}
