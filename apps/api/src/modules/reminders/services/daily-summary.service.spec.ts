import { DailySummaryService } from './daily-summary.service';

// Testa o cron do resumo diário (opt-in): manda 1 mensagem com o consumo de
// ontem (fora-cartão + cartão) e o acumulado do mês; dia sem movimento fica em
// silêncio; respeita opt-in/premium; claim não reenvia; falha de envio libera
// o claim.

// 2026-07-07 15:00 UTC = 12:00 em Brasília → "hoje" BR = 2026-07-07,
// ontem = 2026-07-06.
const NOW = new Date('2026-07-07T15:00:00Z');

const EMPTY_SUMMARY = {
  income: 0,
  expense: 0,
  invoicePayment: 0,
  cardExpense: 0,
  balance: 0,
  incomeCount: 0,
  expenseCount: 0,
};

function buildService(overrides: {
  hasAccess?: boolean;
  dailySummaryEnabled?: boolean;
  daySummary?: Partial<typeof EMPTY_SUMMARY>;
  monthSummary?: Partial<typeof EMPTY_SUMMARY>;
  categories?: unknown[];
  claimResult?: boolean;
  sendFails?: boolean;
  bulkRejects?: boolean; // itens voltam como `rejected` (ex.: 429 de rate-limit)
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
    // Chamadas na ordem do Promise.all: dia, depois mês.
    getSummary: jest
      .fn()
      .mockResolvedValueOnce({ ...EMPTY_SUMMARY, ...overrides.daySummary })
      .mockResolvedValueOnce({ ...EMPTY_SUMMARY, ...overrides.monthSummary }),
    getCategoryBreakdown: jest
      .fn()
      .mockResolvedValue(overrides.categories ?? []),
  };
  const wmodeClient = {
    // Envio em lote: sendFails simula falha total (null); senão tudo enfileirado.
    sendBulk: jest.fn().mockImplementation((messages: { content: string; ref: unknown }[]) => {
      if (overrides.sendFails) return Promise.resolve(null);
      const rejected = overrides.bulkRejects === true;
      if (!rejected) messages.forEach((m) => sent.push(m.content));
      return Promise.resolve({
        total: messages.length,
        queued: rejected ? 0 : messages.length,
        rejected: rejected ? messages.length : 0,
        results: messages.map((m, index) => ({
          index,
          to: '',
          status: rejected ? ('rejected' as const) : ('queued' as const),
          ...(rejected ? { statusCode: 429, reason: 'warmup', retryAfterSeconds: 3600 } : {}),
          ref: m.ref,
        })),
      });
    }),
  };
  const premiumAccess = {
    hasAccess: jest.fn().mockResolvedValue(overrides.hasAccess ?? true),
  };
  const settings = {
    getEffective: jest.fn().mockResolvedValue({
      billsEnabled: true,
      daysBefore: 3,
      alertsEnabled: true,
      dailySummaryEnabled: overrides.dailySummaryEnabled ?? true,
    }),
  };
  const reminderLog = {
    claim: jest.fn().mockResolvedValue(overrides.claimResult ?? true),
    release: jest.fn().mockResolvedValue(undefined),
  };

  const service = new DailySummaryService(
    usersRepository as never,
    familyContext as never,
    transactionsRepository as never,
    wmodeClient as never,
    premiumAccess as never,
    settings as never,
    reminderLog as never,
  );

  return {
    service,
    wmodeClient,
    reminderLog,
    transactionsRepository,
    sent,
  };
}

describe('DailySummaryService', () => {
  it('manda o resumo de ontem com consumo fora-cartão + cartão e o mês', async () => {
    const { service, sent, reminderLog, transactionsRepository } = buildService(
      {
        daySummary: { expense: 50, cardExpense: 100, income: 1200 },
        monthSummary: { expense: 800, cardExpense: 1340, income: 5000 },
        categories: [
          {
            category: { icon: '🍔', name: 'Alimentação' },
            total: 90,
            count: 2,
          },
          { category: { icon: '🚗', name: 'Transporte' }, total: 60, count: 1 },
        ],
      },
    );

    await service.sendDailySummaries(NOW);

    // Janela = ontem (2026-07-06) em UTC, casando com noon-UTC.
    expect(transactionsRepository.getSummary).toHaveBeenNthCalledWith(
      1,
      ['u1'],
      '2026-07-06T00:00:00.000Z',
      '2026-07-06T23:59:59.000Z',
    );
    // Mês de ontem até o fim de ontem.
    expect(transactionsRepository.getSummary).toHaveBeenNthCalledWith(
      2,
      ['u1'],
      '2026-07-01T00:00:00.000Z',
      '2026-07-06T23:59:59.000Z',
    );
    expect(reminderLog.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'daily_summary',
        dedupeKey: 'daily_summary:u1:2026-07-06',
      }),
    );
    expect(sent).toHaveLength(1);
    // Intl.NumberFormat pt-BR usa espaço não separável após "R$" — normaliza
    // para os literais do teste ficarem legíveis.
    const msg = sent[0].replace(/\u00a0/g, ' ');
    expect(msg).toContain('Resumo de ontem (06/07)');
    expect(msg).toContain('Oi, Lucas!');
    // 50 fora-cartão + 100 cartão = 150, em 3 lançamentos (2 + 1).
    expect(msg).toContain('Gastou: R$ 150,00 em 3 lançamentos');
    expect(msg).toContain('🍔 Alimentação: R$ 90,00');
    expect(msg).toContain('Recebeu: R$ 1.200,00');
    expect(msg).toContain('Julho até agora:');
    expect(msg).toContain('R$ 2.140,00 gastos');
  });

  it('dia sem movimento → silêncio (nem claim)', async () => {
    const { service, sent, reminderLog } = buildService({});

    await service.sendDailySummaries(NOW);

    expect(reminderLog.claim).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it('só receita no dia também manda (sem linha de gasto)', async () => {
    const { service, sent } = buildService({
      daySummary: { income: 3000 },
      monthSummary: { income: 3000 },
    });

    await service.sendDailySummaries(NOW);

    expect(sent).toHaveLength(1);
    const msg = sent[0].replace(/\u00a0/g, ' ');
    expect(msg).toContain('Recebeu: R$ 3.000,00');
    expect(msg).not.toContain('Gastou:');
  });

  it('opt-in desligado (default) → não manda', async () => {
    const { service, sent } = buildService({
      dailySummaryEnabled: false,
      daySummary: { expense: 50 },
    });

    await service.sendDailySummaries(NOW);

    expect(sent).toHaveLength(0);
  });

  it('sem acesso premium → não manda', async () => {
    const { service, sent } = buildService({
      hasAccess: false,
      daySummary: { expense: 50 },
    });

    await service.sendDailySummaries(NOW);

    expect(sent).toHaveLength(0);
  });

  it('claim negado (já enviado hoje) → não reenvia', async () => {
    const { service, sent } = buildService({
      claimResult: false,
      daySummary: { expense: 50 },
    });

    await service.sendDailySummaries(NOW);

    expect(sent).toHaveLength(0);
  });

  it('envio que lança → libera o claim', async () => {
    const { service, reminderLog } = buildService({
      sendFails: true,
      daySummary: { expense: 50 },
    });

    await service.sendDailySummaries(NOW);

    expect(reminderLog.release).toHaveBeenCalledWith([
      'daily_summary:u1:2026-07-06',
    ]);
  });

  it('item recusado no lote (429/rate-limit) → libera o claim para retentar depois', async () => {
    const { service, reminderLog } = buildService({
      bulkRejects: true,
      daySummary: { expense: 50 },
    });

    await service.sendDailySummaries(NOW);

    expect(reminderLog.release).toHaveBeenCalledWith([
      'daily_summary:u1:2026-07-06',
    ]);
  });
});
