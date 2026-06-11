import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BudgetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Define (ou atualiza) o orçamento de um mês para um usuário.
  async upsert(userId: string, month: string, amount: number) {
    return this.prisma.budget.upsert({
      where: { userId_month: { userId, month } },
      create: { userId, month, amount: new Prisma.Decimal(amount) },
      update: { amount: new Prisma.Decimal(amount) },
    });
  }

  // Orçamento de um mês — busca entre os userIds da família (qualquer membro
  // pode ter definido o orçamento compartilhado). Retorna o mais recente.
  async findByMonth(userIds: string[], month: string) {
    return this.prisma.budget.findFirst({
      where: { userId: { in: userIds }, month },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string, userIds: string[]) {
    return this.prisma.budget.findFirst({
      where: { id, userId: { in: userIds } },
    });
  }

  async delete(id: string) {
    return this.prisma.budget.delete({ where: { id } });
  }
}
