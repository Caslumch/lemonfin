import { BillRemindersService } from './bill-reminders.service';

// Testa o cron de lembretes de vencimento (Fase 1 do plano de lembretes):
// conta fixa e fatura que vencem em `daysBefore` dias geram 1 mensagem;
// idempotência via claim não reenvia; respeita billsEnabled/premium; fatura
// zerada não avisa; falha de envio libera os claims.
const decimal = (v: number) => ({ toNumber: () => v });

// 2026-07-07 15:00 UTC = 12:00 em Brasília → "hoje" BR = 2026-07-07.
// Com daysBefore=3, alvo = 2026-07-10.
const NOW = new Date('2026-07-07T15:00:00Z');

function buildService(overrides: {
  users?: unknown[];
  hasAccess?: boolean;
  settings?: Partial<{
    billsEnabled: boolean;
    daysBefore: number;
    alertsEnabled: boolean;
  }>;
  recurrings?: unknown[];
  cards?: unknown[];
  cardTotal?: number;
  claimResult?: boolean;
  sendFails?: boolean;
}) {
  const sent: string[] = [];

  const usersRepository = {
    findAllReminderTargets: jest
      .fn()
      .mockResolvedValue(
        overrides.users ?? [{ id: 'u1', name: 'Lucas Dev', phone: '5511999' }],
      ),
  };
  const familyContext = {
    resolveUserIds: jest.fn().mockResolvedValue(['u1']),
  };
  const recurringRepository = {
    findMany: jest.fn().mockResolvedValue(overrides.recurrings ?? []),
  };
  const cardsRepository = {
    findMany: jest.fn().mockResolvedValue(overrides.cards ?? []),
  };
  const transactionsRepository = {
    getCardSummary: jest
      .fn()
      .mockResolvedValue({ total: overrides.cardTotal ?? 0, count: 1 }),
  };
  const wmodeClient = {
    sendMessage: jest.fn().mockImplementation(({ content }) => {
      if (overrides.sendFails) return Promise.reject(new Error('wmode down'));
      sent.push(content);
      return Promise.resolve();
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
      ...overrides.settings,
    }),
  };
  const reminderLog = {
    claim: jest.fn().mockResolvedValue(overrides.claimResult ?? true),
    release: jest.fn().mockResolvedValue(undefined),
  };
  const pushDispatch = {
    sendToUser: jest.fn().mockResolvedValue(false),
  };

  const service = new BillRemindersService(
    usersRepository as never,
    familyContext as never,
    recurringRepository as never,
    cardsRepository as never,
    transactionsRepository as never,
    wmodeClient as never,
    pushDispatch as never,
    premiumAccess as never,
    settings as never,
    reminderLog as never,
  );

  return {
    service,
    wmodeClient,
    reminderLog,
    transactionsRepository,
    premiumAccess,
    settings,
    sent,
  };
}

const aluguel = {
  id: 'rec1',
  description: 'Aluguel',
  amount: decimal(1500),
  type: 'EXPENSE',
  dayOfMonth: 10,
  businessDayAdjustment: 'EXACT',
  category: { icon: '🏠', name: 'Moradia' },
};

describe('BillRemindersService', () => {
  it('avisa conta fixa que vence em daysBefore dias (1 mensagem, com claim)', async () => {
    const { service, sent, reminderLog } = buildService({
      recurrings: [aluguel],
    });

    await service.sendBillReminders(NOW);

    expect(reminderLog.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'bill',
        refId: 'rec1',
        dedupeKey: 'bill:u1:rec1:2026-07-10',
      }),
    );
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain('Aluguel');
    expect(sent[0]).toContain('em 3 dias');
    expect(sent[0]).toContain('10/07');
  });

  it('NÃO avisa conta fixa que vence em outro dia', async () => {
    const { service, sent } = buildService({
      recurrings: [{ ...aluguel, dayOfMonth: 15 }],
    });

    await service.sendBillReminders(NOW);

    expect(sent).toHaveLength(0);
  });

  it('NÃO avisa receitas fixas (salário não precisa de lembrete)', async () => {
    const { service, sent } = buildService({
      recurrings: [{ ...aluguel, type: 'INCOME', description: 'Salário' }],
    });

    await service.sendBillReminders(NOW);

    expect(sent).toHaveLength(0);
  });

  it('idempotência: claim já existente não reenvia', async () => {
    const { service, sent, wmodeClient } = buildService({
      recurrings: [aluguel],
      claimResult: false, // já enviado hoje
    });

    await service.sendBillReminders(NOW);

    expect(wmodeClient.sendMessage).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it('respeita billsEnabled=false (opt-out)', async () => {
    const { service, sent, reminderLog } = buildService({
      recurrings: [aluguel],
      settings: { billsEnabled: false },
    });

    await service.sendBillReminders(NOW);

    expect(reminderLog.claim).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it('respeita o gate premium (sem acesso = sem mensagem)', async () => {
    const { service, sent, settings } = buildService({
      recurrings: [aluguel],
      hasAccess: false,
    });

    await service.sendBillReminders(NOW);

    expect(settings.getEffective).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it('avisa fatura de cartão que vence no alvo, com o total do ciclo certo', async () => {
    const { service, sent, transactionsRepository } = buildService({
      // closingDay 28: ciclo fechado em 27/06 vence dia 10/07 (dueDay 10).
      cards: [{ id: 'c1', name: 'Nubank', closingDay: 28, dueDay: 10 }],
      cardTotal: 1234.5,
    });

    await service.sendBillReminders(NOW);

    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain('Fatura do *Nubank*');
    expect(sent[0]).toContain('1.234,50');
    // Consultou o ciclo que FECHOU em junho (vencimento julho), não o aberto.
    const [, , start, end] = transactionsRepository.getCardSummary.mock
      .calls[0] as [string[], string, string, string];
    expect(start).toContain('2026-05-28');
    expect(end).toContain('2026-06-27');
  });

  it('NÃO avisa fatura zerada (decisão de produto: ruído corrói o canal)', async () => {
    const { service, sent } = buildService({
      cards: [{ id: 'c1', name: 'Nubank', closingDay: 28, dueDay: 10 }],
      cardTotal: 0,
    });

    await service.sendBillReminders(NOW);

    expect(sent).toHaveLength(0);
  });

  it('agrupa conta fixa + fatura numa mensagem só (1 msg/dia por usuário)', async () => {
    const { service, sent, wmodeClient } = buildService({
      recurrings: [aluguel],
      cards: [{ id: 'c1', name: 'Nubank', closingDay: 28, dueDay: 10 }],
      cardTotal: 500,
    });

    await service.sendBillReminders(NOW);

    expect(wmodeClient.sendMessage).toHaveBeenCalledTimes(1);
    expect(sent[0]).toContain('Aluguel');
    expect(sent[0]).toContain('Nubank');
  });

  it('falha no envio LIBERA os claims (o lembrete vale numa nova tentativa)', async () => {
    const { service, reminderLog } = buildService({
      recurrings: [aluguel],
      sendFails: true,
    });

    await service.sendBillReminders(NOW);

    expect(reminderLog.release).toHaveBeenCalledWith([
      'bill:u1:rec1:2026-07-10',
    ]);
  });
});
