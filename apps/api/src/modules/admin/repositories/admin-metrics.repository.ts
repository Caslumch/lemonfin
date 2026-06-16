import { Injectable } from '@nestjs/common';
import { SubscriptionStatus, TransactionSource } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AdminMetrics {
  users: {
    total: number;
    newLast7Days: number;
    newLast30Days: number;
    trialActive: number; // TRIALING com trial vigente
    trialExpired: number; // TRIALING com trial vencido
  };
  subscriptions: {
    active: number;
    pastDue: number;
    canceled: number;
    // MRR estimado: nº de ACTIVE × preço mensal. É APROXIMAÇÃO — não
    // distinguimos mensal/anual no banco (só guardamos o status). Serve de
    // ordem de grandeza até instrumentarmos o ciclo.
    mrrEstimateBRL: number;
  };
  activity: {
    transactionsTotal: number;
    transactionsLast7Days: number;
    bySource: { whatsapp: number; manual: number; recurring: number };
  };
}

// Preço mensal de referência para a estimativa de MRR (R$ 14,90).
const MONTHLY_PRICE_BRL = 14.9;

@Injectable()
export class AdminMetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(now: Date = new Date()): Promise<AdminMetrics> {
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      newLast7Days,
      newLast30Days,
      trialActive,
      trialExpired,
      active,
      pastDue,
      canceled,
      transactionsTotal,
      transactionsLast7Days,
      txWhatsapp,
      txManual,
      txRecurring,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.user.count({
        where: {
          subscriptionStatus: SubscriptionStatus.TRIALING,
          trialEndsAt: { gt: now },
        },
      }),
      this.prisma.user.count({
        where: {
          subscriptionStatus: SubscriptionStatus.TRIALING,
          trialEndsAt: { lte: now },
        },
      }),
      this.prisma.user.count({
        where: { subscriptionStatus: SubscriptionStatus.ACTIVE },
      }),
      this.prisma.user.count({
        where: { subscriptionStatus: SubscriptionStatus.PAST_DUE },
      }),
      this.prisma.user.count({
        where: { subscriptionStatus: SubscriptionStatus.CANCELED },
      }),
      this.prisma.transaction.count(),
      this.prisma.transaction.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.transaction.count({
        where: { source: TransactionSource.WHATSAPP },
      }),
      this.prisma.transaction.count({
        where: { source: TransactionSource.MANUAL },
      }),
      this.prisma.transaction.count({
        where: { source: TransactionSource.RECURRING },
      }),
    ]);

    return {
      users: {
        total,
        newLast7Days,
        newLast30Days,
        trialActive,
        trialExpired,
      },
      subscriptions: {
        active,
        pastDue,
        canceled,
        mrrEstimateBRL: Math.round(active * MONTHLY_PRICE_BRL * 100) / 100,
      },
      activity: {
        transactionsTotal,
        transactionsLast7Days,
        bySource: {
          whatsapp: txWhatsapp,
          manual: txManual,
          recurring: txRecurring,
        },
      },
    };
  }
}
