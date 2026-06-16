import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface DailyPoint {
  day: string; // 'YYYY-MM-DD'
  count: number;
}
export interface DailyCost {
  day: string;
  costUsd: number;
}

export interface AdminTrends {
  newUsers: DailyPoint[];
  transactions: DailyPoint[];
  aiCost: DailyCost[];
}

// Linhas cruas do date_trunc (count vem como bigint do Postgres → string/number).
interface RawCount {
  day: Date;
  count: number | bigint;
}
interface RawCost {
  day: Date;
  cost: number | string | null;
}

@Injectable()
export class AdminTrendsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getTrends(days = 30): Promise<AdminTrends> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [users, transactions, aiCost] = await Promise.all([
      this.prisma.$queryRaw<RawCount[]>`
        SELECT date_trunc('day', "created_at") AS day, COUNT(*)::int AS count
        FROM "users" WHERE "created_at" >= ${since}
        GROUP BY day ORDER BY day ASC`,
      this.prisma.$queryRaw<RawCount[]>`
        SELECT date_trunc('day', "created_at") AS day, COUNT(*)::int AS count
        FROM "transactions" WHERE "created_at" >= ${since}
        GROUP BY day ORDER BY day ASC`,
      this.prisma.$queryRaw<RawCost[]>`
        SELECT date_trunc('day', "created_at") AS day, SUM("cost_usd") AS cost
        FROM "ai_usage" WHERE "created_at" >= ${since}
        GROUP BY day ORDER BY day ASC`,
    ]);

    const isoDay = (d: Date) => d.toISOString().slice(0, 10);

    return {
      newUsers: users.map((r) => ({
        day: isoDay(r.day),
        count: Number(r.count),
      })),
      transactions: transactions.map((r) => ({
        day: isoDay(r.day),
        count: Number(r.count),
      })),
      aiCost: aiCost.map((r) => ({
        day: isoDay(r.day),
        costUsd: Number(r.cost ?? 0),
      })),
    };
  }
}
