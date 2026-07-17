import { WhatsappService } from './whatsapp.service';

// Testa o handleCorrectionDate ("foi ontem", "a data é dia 14"): reancora a
// ÚLTIMA AÇÃO inteira na nova data via lastAction (parcelas deslocam juntas);
// fallback à última transação recente; sem alvo recente, orienta pro painel.
// Mocka apenas as dependências que esse caminho usa.
function buildService(overrides: {
  lastAction?: unknown;
  lastTx?: unknown;
  shiftResult?: { count: number; deltaDays: number };
}) {
  const sent: string[] = [];

  const conversation = {
    getLastAction: jest.fn().mockResolvedValue(overrides.lastAction ?? null),
    appendHistory: jest.fn().mockResolvedValue(undefined),
  };
  const transactionsRepository = {
    shiftDatesToAnchor: jest
      .fn()
      .mockResolvedValue(overrides.shiftResult ?? { count: 1, deltaDays: -1 }),
    findLastByUser: jest.fn().mockResolvedValue(overrides.lastTx ?? null),
  };
  const familyContext = {
    resolveUserIds: jest.fn().mockResolvedValue(['u1']),
  };
  const wmodeClient = {
    sendMessage: jest.fn().mockImplementation(({ content }) => {
      sent.push(content);
      return Promise.resolve();
    }),
  };

  const service = new WhatsappService(
    {} as never, // users
    {} as never, // categories
    transactionsRepository as never,
    {} as never, // cards
    familyContext as never,
    {} as never, // createInstallments
    {} as never, // parser
    {} as never, // transcription
    {} as never, // receiptExtraction
    wmodeClient as never,
    {} as never, // forecast
    {} as never, // recurring
    {} as never, // reserves
    {} as never, // goals
    {} as never, // listGoals
    {} as never, // chat
    conversation as never,
    {} as never, // premiumAccess
    {} as never, // billingConfig
    {} as never, // payInvoice
  );

  return { service, transactionsRepository, conversation, sent };
}

const call = (
  service: WhatsappService,
  newDate: string,
  phoneKey = '5511999',
) =>
  (
    service as unknown as {
      handleCorrectionDate: (
        from: string,
        userId: string,
        newDate: string,
        phoneKey?: string,
      ) => Promise<void>;
    }
  ).handleCorrectionDate('5511999@c.us', 'u1', newDate, phoneKey);

describe('WhatsappService.handleCorrectionDate', () => {
  it('reancora a última ação na nova data (âncora ao meio-dia UTC)', async () => {
    const { service, transactionsRepository, sent } = buildService({
      lastAction: {
        kind: 'transaction',
        transactionIds: ['tx1'],
        label: 'R$ 7,00 em Alimentação',
      },
      shiftResult: { count: 1, deltaDays: -1 },
    });

    await call(service, '2026-07-15');

    expect(transactionsRepository.shiftDatesToAnchor).toHaveBeenCalledWith(
      ['tx1'],
      ['u1'],
      '2026-07-15T12:00:00.000Z',
    );
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain('15/07');
    expect(sent[0]).toContain('R$ 7,00 em Alimentação');
  });

  it('parcelamento move todas as transações juntas (mensagem no plural)', async () => {
    const { service, sent } = buildService({
      lastAction: {
        kind: 'installment',
        transactionIds: ['t1', 't2', 't3'],
        label: 'R$ 300 em 3x',
      },
      shiftResult: { count: 3, deltaDays: -2 },
    });

    await call(service, '2026-07-14');

    expect(sent[0]).toContain('Movi as 3 transações');
    expect(sent[0]).toContain('14/07');
  });

  it('data já correta → avisa que nada mudou', async () => {
    const { service, sent } = buildService({
      lastAction: {
        kind: 'transaction',
        transactionIds: ['tx1'],
        label: 'Coca',
      },
      shiftResult: { count: 1, deltaDays: 0 },
    });

    await call(service, '2026-07-16');

    expect(sent[0]).toContain('Já estava');
  });

  it('sem lastAction, usa a última transação SE recente', async () => {
    const { service, transactionsRepository, sent } = buildService({
      lastTx: {
        id: 'tx9',
        description: 'Mercado',
        category: { name: 'Alimentação' },
        createdAt: new Date(), // agora → recente
      },
      shiftResult: { count: 1, deltaDays: -1 },
    });

    await call(service, '2026-07-15');

    expect(transactionsRepository.shiftDatesToAnchor).toHaveBeenCalledWith(
      ['tx9'],
      ['u1'],
      expect.any(String),
    );
    expect(sent[0]).toContain('Mercado');
  });

  it('sem alvo recente → orienta pro painel, sem mexer em nada', async () => {
    const { service, transactionsRepository, sent } = buildService({
      lastTx: {
        id: 'tx-velha',
        description: 'Antiga',
        category: { name: 'Outros' },
        createdAt: new Date('2026-01-01'), // antiga → fora da guarda
      },
    });

    await call(service, '2026-07-15');

    expect(transactionsRepository.shiftDatesToAnchor).not.toHaveBeenCalled();
    expect(sent[0]).toContain('painel');
  });

  it('shift sem linhas afetadas → mensagem de erro amigável', async () => {
    const { service, sent } = buildService({
      lastAction: {
        kind: 'transaction',
        transactionIds: ['tx1'],
        label: 'Coca',
      },
      shiftResult: { count: 0, deltaDays: 0 },
    });

    await call(service, '2026-07-15');

    expect(sent[0]).toContain('Não consegui corrigir a data');
  });
});
