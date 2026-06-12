import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ReservesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    targetAmount: number;
    deadline: Date;
    userId: string;
  }) {
    return this.prisma.reserve.create({
      data: {
        name: data.name,
        targetAmount: new Prisma.Decimal(data.targetAmount),
        deadline: data.deadline,
        userId: data.userId,
      },
    });
  }

  async findManyActive(userIds: string[]) {
    return this.prisma.reserve.findMany({
      where: { userId: { in: userIds }, active: true },
      orderBy: { deadline: 'asc' },
    });
  }

  async findById(id: string, userIds: string[]) {
    return this.prisma.reserve.findFirst({
      where: { id, userId: { in: userIds } },
    });
  }

  // Incrementa savedAmount atomicamente (evita read-modify-write). Quando a
  // reserva atinge o alvo, desativa para sair da lista/seletor de aportes.
  async addContribution(id: string, amount: number) {
    const reserve = await this.prisma.reserve.update({
      where: { id },
      data: { savedAmount: { increment: new Prisma.Decimal(amount) } },
    });

    if (reserve.active && reserve.savedAmount.gte(reserve.targetAmount)) {
      return this.prisma.reserve.update({
        where: { id },
        data: { active: false },
      });
    }
    return reserve;
  }
}
