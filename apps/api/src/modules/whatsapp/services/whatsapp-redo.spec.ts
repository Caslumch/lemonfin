import { WhatsappService } from './whatsapp.service';

// Testa só o handleRedo: refaz a última ação (re-parcelar / separar com itens),
// usando estratégia "cria-depois-apaga". Mocka apenas as dependências do
// caminho; as demais ficam como stubs.
function buildService(overrides: {
  lastAction?: unknown;
  prevTransactions?: unknown[];
  cardByName?: unknown;
}) {
  const sent: string[] = [];
  let createSeq = 0;

  const conversation = {
    getLastAction: jest.fn().mockResolvedValue(overrides.lastAction ?? null),
    setLastAction: jest.fn().mockResolvedValue(undefined),
    clearLastAction: jest.fn().mockResolvedValue(undefined),
  };
  const transactionsRepository = {
    findManyByIds: jest
      .fn()
      .mockResolvedValue(overrides.prevTransactions ?? []),
    deleteManyByIds: jest.fn().mockResolvedValue(0),
    // Cada create devolve um id novo e determinístico.
    create: jest.fn().mockImplementation(() => {
      createSeq += 1;
      return Promise.resolve({ id: `new${createSeq}` });
    }),
  };
  const cardsRepository = {
    findByName: jest.fn().mockResolvedValue(overrides.cardByName ?? null),
  };
  // Mock fiel do use-case de parcelas: cria N transações pela repo (como o real),
  // para que as asserções sobre transactionsRepository.create continuem valendo.
  const createInstallmentsUseCase = {
    execute: jest
      .fn()
      .mockImplementation(
        async (params: {
          amount: number;
          installments: number;
          description: string;
          userId: string;
          categoryId: string;
          cardId?: string;
          source?: string;
        }) => {
          const perInstallment =
            Math.round((params.amount / params.installments) * 100) / 100;
          const transactionIds: string[] = [];
          for (let i = 0; i < params.installments; i++) {
            const tx = (await transactionsRepository.create({
              amount: perInstallment,
              type: 'EXPENSE',
              description: `${params.description} (${i + 1}/${params.installments})`,
              source: params.source ?? 'MANUAL',
              userId: params.userId,
              categoryId: params.categoryId,
              cardId: params.cardId,
              installmentGroupId: 'grp1',
              installmentNumber: i + 1,
              installmentTotal: params.installments,
            })) as { id: string };
            transactionIds.push(tx.id);
          }
          return {
            perInstallment,
            installmentGroupId: 'grp1',
            transactionIds,
          };
        },
      ),
  };
  const categoriesRepository = {
    findBySlug: jest
      .fn()
      .mockResolvedValue({ id: 'cat1', name: 'Compras', icon: '🛍️' }),
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
    categoriesRepository as never,
    transactionsRepository as never,
    cardsRepository as never,
    familyContext as never,
    createInstallmentsUseCase as never,
    {} as never, // parser
    {} as never, // transcription
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
  );

  return {
    service,
    conversation,
    transactionsRepository,
    cardsRepository,
    wmodeClient,
    sent,
  };
}

const callRedo = (
  service: WhatsappService,
  adjust: Record<string, unknown>,
): Promise<void> =>
  (
    service as unknown as {
      handleRedo: (
        f: string,
        u: string,
        r: { intent: 'redo'; adjust: Record<string, unknown> },
        p?: string,
      ) => Promise<void>;
    }
  ).handleRedo('551199@c.us', 'u1', { intent: 'redo', adjust }, '551199');

describe('WhatsappService.handleRedo', () => {
  it('avisa quando não há ação recente para refazer', async () => {
    const { service, transactionsRepository, sent } = buildService({
      lastAction: null,
    });

    await callRedo(service, { installments: 4 });

    expect(transactionsRepository.create).not.toHaveBeenCalled();
    expect(transactionsRepository.deleteManyByIds).not.toHaveBeenCalled();
    expect(sent[0]).toContain('refazer');
  });

  it('re-parcela a mesma compra (cria as N e só então apaga a anterior)', async () => {
    const { service, transactionsRepository, conversation, sent } =
      buildService({
        lastAction: {
          kind: 'transaction',
          transactionIds: ['old1'],
          label: 'duas blusas',
        },
        prevTransactions: [
          {
            id: 'old1',
            amount: 278,
            type: 'EXPENSE',
            description: 'duas blusas',
            categoryId: 'cat1',
            cardId: 'card1',
            category: { name: 'Compras' },
          },
        ],
      });

    await callRedo(service, { installments: 4 });

    // 4 parcelas criadas...
    expect(transactionsRepository.create).toHaveBeenCalledTimes(4);
    // ...ANTES de apagar a anterior (cria-depois-apaga).
    expect(transactionsRepository.deleteManyByIds).toHaveBeenCalledWith(
      ['old1'],
      ['u1'],
    );
    // Cada parcela = 278/4 = 69.50.
    expect(transactionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 69.5, installmentTotal: 4 }),
    );
    expect(conversation.setLastAction).toHaveBeenCalledWith(
      '551199',
      expect.objectContaining({ kind: 'installment' }),
    );
    expect(sent[0]).toContain('Refiz');
  });

  it('separa em itens explícitos fornecidos pelo usuário', async () => {
    const { service, transactionsRepository } = buildService({
      lastAction: {
        kind: 'installment',
        transactionIds: ['o1', 'o2', 'o3', 'o4'],
        installmentGroupId: 'g1',
        installments: 4,
        label: 'duas blusas (4x)',
      },
      prevTransactions: [
        {
          id: 'o1',
          amount: 69.5,
          type: 'EXPENSE',
          description: 'duas blusas (1/4)',
          categoryId: 'cat1',
          cardId: null,
          category: { name: 'Compras' },
        },
      ],
    });

    await callRedo(service, {
      items: [
        {
          intent: 'transaction',
          data: {
            amount: 139,
            type: 'EXPENSE',
            categorySlug: 'compras',
            categoryConfidence: 1,
            description: 'blusa para mim',
          },
        },
        {
          intent: 'transaction',
          data: {
            amount: 139,
            type: 'EXPENSE',
            categorySlug: 'compras',
            categoryConfidence: 1,
            description: 'blusa para esposa',
          },
        },
      ],
    });

    // 2 transações novas criadas; a ação anterior (4 parcelas) apagada.
    expect(transactionsRepository.create).toHaveBeenCalledTimes(2);
    expect(transactionsRepository.deleteManyByIds).toHaveBeenCalledWith(
      ['o1', 'o2', 'o3', 'o4'],
      ['u1'],
    );
  });

  it('limpa o lastAction e avisa quando as transações anteriores sumiram', async () => {
    const { service, conversation, transactionsRepository, sent } =
      buildService({
        lastAction: {
          kind: 'transaction',
          transactionIds: ['gone'],
          label: 'x',
        },
        prevTransactions: [], // já removidas
      });

    await callRedo(service, { installments: 3 });

    expect(transactionsRepository.create).not.toHaveBeenCalled();
    expect(conversation.clearLastAction).toHaveBeenCalled();
    expect(sent[0]).toContain('não está mais aqui');
  });
});
