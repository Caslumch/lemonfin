import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SavingsGoalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    targetAmount: number;
    deadline: Date;
    userId: string;
  }) {
    return this.prisma.savingsGoal.create({
      data: {
        name: data.name,
        targetAmount: new Prisma.Decimal(data.targetAmount),
        deadline: data.deadline,
        userId: data.userId,
      },
    });
  }

  async findManyActive(userIds: string[]) {
    return this.prisma.savingsGoal.findMany({
      where: { userId: { in: userIds }, active: true },
      orderBy: { deadline: 'asc' },
    });
  }

  async findById(id: string, userIds: string[]) {
    return this.prisma.savingsGoal.findFirst({
      where: { id, userId: { in: userIds } },
    });
  }

  // Incrementa savedAmount atomicamente (evita read-modify-write). Quando a meta
  // é atingida, desativa para sair da lista/seletor de aportes.
  async addContribution(id: string, amount: number) {
    const goal = await this.prisma.savingsGoal.update({
      where: { id },
      data: { savedAmount: { increment: new Prisma.Decimal(amount) } },
    });

    if (goal.active && goal.savedAmount.gte(goal.targetAmount)) {
      return this.prisma.savingsGoal.update({
        where: { id },
        data: { active: false },
      });
    }
    return goal;
  }
}
