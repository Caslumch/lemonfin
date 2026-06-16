import { AdminMetricsRepository } from './admin-metrics.repository';

describe('AdminMetricsRepository', () => {
  it('agrega counts e estima o MRR (ativas × 14,90)', async () => {
    // count() é chamado 13x na ordem do Promise.all; devolvemos valores fixos.
    const counts = [
      100, // total
      8, // newLast7Days
      25, // newLast30Days
      12, // trialActive
      5, // trialExpired
      10, // active
      2, // pastDue
      7, // canceled
      500, // transactionsTotal
      60, // transactionsLast7Days
      300, // whatsapp
      150, // manual
      50, // recurring
    ];
    let i = 0;
    const prisma = {
      user: { count: jest.fn(() => Promise.resolve(counts[i++])) },
      transaction: { count: jest.fn(() => Promise.resolve(counts[i++])) },
    };
    const repo = new AdminMetricsRepository(prisma as never);

    const m = await repo.getMetrics(new Date('2026-06-16T00:00:00Z'));

    expect(m.users).toEqual({
      total: 100,
      newLast7Days: 8,
      newLast30Days: 25,
      trialActive: 12,
      trialExpired: 5,
    });
    expect(m.subscriptions).toEqual({
      active: 10,
      pastDue: 2,
      canceled: 7,
      mrrEstimateBRL: 149, // 10 × 14,90
    });
    expect(m.activity.bySource).toEqual({
      whatsapp: 300,
      manual: 150,
      recurring: 50,
    });
  });
});
