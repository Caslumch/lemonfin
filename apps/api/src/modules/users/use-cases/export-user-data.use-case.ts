import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// Exportação dos dados do titular (LGPD — portabilidade/acesso, art. 18).
// Devolve um JSON com TUDO que pertence ao usuário. Escopo: apenas os dados
// do PRÓPRIO usuário (userId), nunca dos demais membros da família — a
// portabilidade é do titular.
@Injectable()
export class ExportUserDataUseCase {
  private readonly logger = new Logger(ExportUserDataUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        onboardedAt: true,
        emailVerifiedAt: true,
        trialEndsAt: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        termsAcceptedAt: true,
        termsVersion: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    const [
      transactions,
      cards,
      goals,
      reserves,
      recurring,
      categories,
      invoicePayments,
      reminderSetting,
      familyMemberships,
    ] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
        select: {
          amount: true,
          type: true,
          description: true,
          date: true,
          source: true,
          installmentNumber: true,
          installmentTotal: true,
          createdAt: true,
          category: { select: { name: true, slug: true } },
          card: { select: { name: true } },
        },
      }),
      this.prisma.card.findMany({
        where: { userId },
        select: {
          name: true,
          closingDay: true,
          dueDay: true,
          createdAt: true,
        },
      }),
      this.prisma.goal.findMany({
        where: { userId },
        select: {
          name: true,
          amount: true,
          period: true,
          active: true,
          createdAt: true,
          category: { select: { name: true } },
        },
      }),
      this.prisma.reserve.findMany({
        where: { userId },
        select: {
          name: true,
          targetAmount: true,
          savedAmount: true,
          deadline: true,
          active: true,
          createdAt: true,
        },
      }),
      this.prisma.recurringTransaction.findMany({
        where: { userId },
        select: {
          description: true,
          amount: true,
          type: true,
          dayOfMonth: true,
          active: true,
          createdAt: true,
          category: { select: { name: true } },
        },
      }),
      this.prisma.category.findMany({
        // Só as categorias criadas PELO usuário (as de sistema não são dado dele).
        where: { userId },
        select: { name: true, slug: true, icon: true, createdAt: true },
      }),
      this.prisma.invoicePayment.findMany({
        where: { userId },
        select: {
          cycle: true,
          amount: true,
          createdAt: true,
          card: { select: { name: true } },
        },
      }),
      this.prisma.reminderSetting.findUnique({
        where: { userId },
        select: { billsEnabled: true, daysBefore: true, alertsEnabled: true },
      }),
      this.prisma.familyMember.findMany({
        where: { userId },
        select: {
          role: true,
          joinedAt: true,
          family: { select: { name: true } },
        },
      }),
    ]);

    this.logger.log(
      `Dados exportados [user:${userId}] (${transactions.length} transacoes)`,
    );

    return {
      exportedAt: new Date().toISOString(),
      format: 'lemonfin-export-v1',
      profile: user,
      transactions,
      cards,
      goals,
      reserves,
      recurring,
      customCategories: categories,
      invoicePayments,
      reminderSettings: reminderSetting,
      families: familyMemberships.map((m) => ({
        name: m.family.name,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    };
  }
}
