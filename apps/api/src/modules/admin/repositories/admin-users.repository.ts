import { Injectable } from '@nestjs/common';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  isSuperAdmin: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

const PAGE_SIZE = 20;

@Injectable()
export class AdminUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista paginada de usuários, com busca por nome/email. */
  async list(params: { search?: string; page?: number }): Promise<{
    rows: AdminUserRow[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, params.page ?? 1);
    const where: Prisma.UserWhereInput = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
          isSuperAdmin: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { rows, total, page, pageSize: PAGE_SIZE };
  }

  /** Top consumidores de IA por custo (USD) no período (dias). */
  async topAiSpenders(days: number, limit = 10) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const grouped = await this.prisma.aiUsage.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since }, userId: { not: null } },
      _sum: { costUsd: true, totalTokens: true },
      orderBy: { _sum: { costUsd: 'desc' } },
      take: limit,
    });

    const userIds = grouped
      .map((g) => g.userId)
      .filter((x): x is string => !!x);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return grouped.map((g) => ({
      userId: g.userId,
      name: g.userId ? (byId.get(g.userId)?.name ?? '—') : '—',
      email: g.userId ? (byId.get(g.userId)?.email ?? '—') : '—',
      costUsd: Number(g._sum.costUsd ?? 0),
      tokens: g._sum.totalTokens ?? 0,
    }));
  }
}
