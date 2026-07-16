import { AlertsService } from './alerts.service';

// Testa o FOLLOW-UP de metas e reservas (fechar o ciclo dos alertas):
// - comparativo mensal ganha o fechamento das metas do mês que acabou
//   (✅ fechou dentro / 🚨 estourou), não só o "estourou" do cron diário;
// - check-in mensal das reservas ativas (progresso, aporte sugerido, ritmo),
//   com silêncio para quem não tem reserva.
const decimal = (v: number) => ({ toNumber: () => v });

function buildService(overrides: {
  goals?: unknown[];
  reserves?: unknown[];
  prevCategories?: unknown[];
}) {
  const sent: string[] = [];

  const usersRepository = {
    findAllWithPhone: jest
      .fn()
      .mockResolvedValue([{ id: 'u1', name: 'Lucas Dev', phone: '5511999' }]),
  };
  const familyContext = {
    resolveUserIds: jest.fn().mockResolvedValue(['u1']),
  };
  const transactionsRepository = {
    // 1ª chamada = mês anterior, 2ª = retrasado (ordem do Promise.all).
    getSummary: jest
      .fn()
      .mockResolvedValue({ income: 5000, expense: 3000, balance: 2000 }),
    getCategoryBreakdown: jest
      .fn()
      .mockResolvedValueOnce(overrides.prevCategories ?? [])
      .mockResolvedValueOnce([]),
  };
  const goalsRepository = {
    findMany: jest.fn().mockResolvedValue(overrides.goals ?? []),
  };
  const reservesRepository = {
    findManyActive: jest.fn().mockResolvedValue(overrides.reserves ?? []),
  };
  const wmodeClient = {
    sendMessage: jest.fn().mockImplementation(({ content }) => {
      sent.push(content);
      return Promise.resolve({ id: 'msg-1' });
    }),
  };
  const premiumAccess = { hasAccess: jest.fn().mockResolvedValue(true) };
  const reminderSettings = {
    getEffective: jest.fn().mockResolvedValue({
      billsEnabled: true,
      daysBefore: 3,
      alertsEnabled: true,
    }),
  };

  const service = new AlertsService(
    transactionsRepository as never,
    usersRepository as never,
    familyContext as never,
    wmodeClient as never,
    goalsRepository as never,
    reservesRepository as never,
    {} as never, // recurring
    premiumAccess as never,
    reminderSettings as never,
  );

  return { service, wmodeClient, reservesRepository, sent };
}

// Normaliza o espaço não separável do Intl ("R$ 100,00") para os literais.
const norm = (s: string) => s.replace(/\u00a0/g, ' ');

describe('AlertsService — fechamento de metas no comparativo mensal', () => {
  it('meta dentro do limite fecha com ✅ e parabéns quando todas fecham', async () => {
    const { service, sent } = buildService({
      goals: [
        {
          name: 'Alimentação',
          amount: decimal(800),
          period: 'MONTHLY',
          categoryId: 'cat1',
          category: { icon: '🍔', name: 'Alimentação' },
        },
      ],
      prevCategories: [
        {
          categoryId: 'cat1',
          category: { icon: '🍔', name: 'Alimentação' },
          total: 720,
          count: 12,
        },
      ],
    });

    await service.sendMonthlyComparisons();

    expect(sent).toHaveLength(1);
    const msg = norm(sent[0]);
    expect(msg).toContain('Suas metas em');
    expect(msg).toContain(
      '✅ 🍔 Alimentação: R$ 720,00 de R$ 800,00 (90%) — fechou dentro!',
    );
    expect(msg).toContain('Todas dentro do limite — mandou muito! 👏');
  });

  it('meta estourada fecha com 🚨 e o excedente (sem o parabéns geral)', async () => {
    const { service, sent } = buildService({
      goals: [
        {
          name: 'Lazer',
          amount: decimal(300),
          period: 'MONTHLY',
          categoryId: 'cat2',
          category: { icon: '🎮', name: 'Lazer' },
        },
      ],
      prevCategories: [
        {
          categoryId: 'cat2',
          category: { icon: '🎮', name: 'Lazer' },
          total: 450,
          count: 5,
        },
      ],
    });

    await service.sendMonthlyComparisons();

    const msg = norm(sent[0]);
    expect(msg).toContain(
      '🚨 🎮 Lazer: R$ 450,00 de R$ 300,00 — estourou por R$ 150,00',
    );
    expect(msg).not.toContain('mandou muito');
  });

  it('meta sem gasto no mês fecha dentro com R$ 0,00 (0%)', async () => {
    const { service, sent } = buildService({
      goals: [
        {
          name: 'Lazer',
          amount: decimal(300),
          period: 'MONTHLY',
          categoryId: 'cat2',
          category: { icon: '🎮', name: 'Lazer' },
        },
      ],
      prevCategories: [],
    });

    await service.sendMonthlyComparisons();

    const msg = norm(sent[0]);
    expect(msg).toContain('✅ 🎮 Lazer: R$ 0,00 de R$ 300,00 (0%)');
  });

  it('sem metas → comparativo sai sem a seção de metas', async () => {
    const { service, sent } = buildService({ goals: [] });

    await service.sendMonthlyComparisons();

    expect(sent).toHaveLength(1);
    expect(sent[0]).not.toContain('Suas metas em');
  });
});

describe('AlertsService — check-in mensal das reservas', () => {
  // Reserva criada há 1 mês com prazo daqui a 3: ~25% do tempo decorrido.
  const monthsFromNow = (n: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + n);
    return d;
  };

  it('reserva adiantada fecha "no ritmo" com aporte sugerido e prazo', async () => {
    const { service, sent } = buildService({
      reserves: [
        {
          name: 'Viagem',
          targetAmount: decimal(5000),
          savedAmount: decimal(2000), // 40% guardado vs ~25% do tempo
          deadline: monthsFromNow(3),
          createdAt: monthsFromNow(-1),
          active: true,
        },
      ],
    });

    await service.sendReserveCheckins();

    expect(sent).toHaveLength(1);
    const msg = norm(sent[0]);
    expect(msg).toContain('Check-in das reservas');
    expect(msg).toContain('Oi, Lucas!');
    expect(msg).toContain(
      '✅ *Viagem*: R$ 2.000,00 de R$ 5.000,00 (40%) — no ritmo!',
    );
    expect(msg).toContain('Faltam R$ 3.000,00');
    expect(msg).toContain('R$ 1.000,00/mês'); // 3000 restantes / 3 meses
    expect(msg).toContain('guardei 200');
  });

  it('reserva atrasada fecha "vale acelerar"', async () => {
    const { service, sent } = buildService({
      reserves: [
        {
          name: 'Reforma',
          targetAmount: decimal(10000),
          savedAmount: decimal(1000), // 10% guardado vs ~50% do tempo
          deadline: monthsFromNow(2),
          createdAt: monthsFromNow(-2),
          active: true,
        },
      ],
    });

    await service.sendReserveCheckins();

    const msg = norm(sent[0]);
    expect(msg).toContain('⏳ *Reforma*');
    expect(msg).toContain('vale acelerar');
  });

  it('objetivo batido só celebra (sem aporte sugerido)', async () => {
    const { service, sent } = buildService({
      reserves: [
        {
          name: 'Emergência',
          targetAmount: decimal(3000),
          savedAmount: decimal(3200),
          deadline: monthsFromNow(1),
          createdAt: monthsFromNow(-3),
          active: true,
        },
      ],
    });

    await service.sendReserveCheckins();

    const msg = norm(sent[0]);
    expect(msg).toContain(
      '🎉 *Emergência*: R$ 3.000,00 completos — objetivo alcançado',
    );
    expect(msg).not.toContain('/mês');
  });

  it('prazo vencido sem completar convida a ajustar', async () => {
    const { service, sent } = buildService({
      reserves: [
        {
          name: 'Notebook',
          targetAmount: decimal(4000),
          savedAmount: decimal(1500),
          deadline: monthsFromNow(-1),
          createdAt: monthsFromNow(-6),
          active: true,
        },
      ],
    });

    await service.sendReserveCheckins();

    const msg = norm(sent[0]);
    expect(msg).toContain('⏰ *Notebook*');
    expect(msg).toContain('o prazo passou');
    expect(msg).toContain('ajustar o prazo ou o valor');
  });

  it('sem reservas ativas → silêncio', async () => {
    const { service, sent, wmodeClient } = buildService({ reserves: [] });

    await service.sendReserveCheckins();

    expect(wmodeClient.sendMessage).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });
});
