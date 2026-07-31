import { WhatsappService } from './whatsapp.service';
import { PendingConfirmation } from '../repositories/conversation.repository';

// Testa o fluxo de AMBIGUIDADE DE CARTÃO: "gastei 50 no nubank" com 2 matches
// não pode descartar a transação — ela vira pendência (type 'card') e a
// resposta ("2", "o roxinho", "sem cartão") resolve SEM re-parse. Antes, a
// resposta era re-parseada fria e o usuário tinha que redigitar o gasto.
function buildService(overrides: {
  fuzzyMatches?: Array<{ id: string; name: string }>;
  allCards?: Array<{ id: string; name: string }>;
}) {
  const sent: string[] = [];

  const conversation = {
    setPending: jest.fn().mockResolvedValue(undefined),
    clearPending: jest.fn().mockResolvedValue(undefined),
    setLastAction: jest.fn().mockResolvedValue(undefined),
    appendHistory: jest.fn().mockResolvedValue(undefined),
  };
  const categoriesRepository = {
    findBySlug: jest.fn().mockResolvedValue({
      id: 'cat1',
      slug: 'alimentacao',
      name: 'Alimentação',
      icon: '🍽️',
    }),
  };
  const cardsRepository = {
    findByNameFuzzy: jest.fn().mockResolvedValue(overrides.fuzzyMatches ?? []),
    findMany: jest.fn().mockResolvedValue(overrides.allCards ?? []),
  };
  const transactionsRepository = {
    findPossibleDuplicate: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'tx-new' }),
    getCategoryBreakdown: jest.fn().mockResolvedValue([]),
  };
  // O registro consulta a meta da categoria para o insight em tempo real.
  const goalsRepository = {
    findByCategory: jest.fn().mockResolvedValue(null),
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
    {} as never, // createInstallments
    {} as never, // parser
    {} as never, // transcription
    {} as never, // receiptExtraction
    wmodeClient as never,
    {} as never, // forecast
    {} as never, // recurring
    {} as never, // reserves
    goalsRepository as never,
    {} as never, // listGoals
    {} as never, // chat
    conversation as never,
    {} as never, // premiumAccess
    {} as never, // billingConfig
    {} as never, // payInvoice
    {} as never, // tts
  );

  return {
    service,
    conversation,
    cardsRepository,
    transactionsRepository,
    wmodeClient,
    sent,
  };
}

const txData = (cardName: string) => ({
  intent: 'transaction' as const,
  data: {
    amount: 50,
    type: 'EXPENSE' as const,
    categorySlug: 'alimentacao',
    categoryConfidence: 1,
    description: 'mercado',
    cardName,
  },
});

const callTransaction = (
  service: WhatsappService,
  cardName: string,
  phoneKey = '5511999',
): Promise<void> =>
  (
    service as unknown as {
      handleTransaction: (
        f: string,
        u: string,
        r: unknown,
        p?: string,
      ) => Promise<void>;
    }
  ).handleTransaction('5511999@c.us', 'u1', txData(cardName), phoneKey);

const callResolvePending = (
  service: WhatsappService,
  pending: PendingConfirmation,
  content: string,
): Promise<boolean> =>
  (
    service as unknown as {
      tryResolvePending: (
        f: string,
        pk: string,
        u: string,
        p: PendingConfirmation,
        c: string,
      ) => Promise<boolean>;
    }
  ).tryResolvePending('5511999@c.us', '5511999', 'u1', pending, content);

const cardPending: PendingConfirmation = {
  type: 'card',
  amount: 50,
  txType: 'EXPENSE',
  description: 'mercado',
  categorySlug: 'alimentacao',
  options: [
    { id: 'c1', name: 'Nubank' },
    { id: 'c2', name: 'Nubank Ultravioleta' },
  ],
};

describe('fluxo de pendência de cartão', () => {
  it('cartão ambíguo vira pendência com a transação em voo (nada registrado)', async () => {
    const { service, conversation, transactionsRepository, sent } =
      buildService({
        fuzzyMatches: [
          { id: 'c1', name: 'Nubank' },
          { id: 'c2', name: 'Nubank Ultravioleta' },
        ],
        allCards: [
          { id: 'c1', name: 'Nubank' },
          { id: 'c2', name: 'Nubank Ultravioleta' },
        ],
      });

    await callTransaction(service, 'nubank');

    expect(transactionsRepository.create).not.toHaveBeenCalled();
    expect(conversation.setPending).toHaveBeenCalledWith(
      '5511999',
      expect.objectContaining({
        type: 'card',
        amount: 50,
        description: 'mercado',
        categorySlug: 'alimentacao',
        options: [
          { id: 'c1', name: 'Nubank' },
          { id: 'c2', name: 'Nubank Ultravioleta' },
        ],
      }),
    );
    // Oferece as opções numeradas.
    expect(sent[0]).toContain('1. Nubank');
    expect(sent[0]).toContain('2. Nubank Ultravioleta');
  });

  it('resposta com o NÚMERO registra a transação no cartão escolhido', async () => {
    const { service, transactionsRepository, cardsRepository } = buildService({
      // O nome exato vindo da opção resolve pra 1 match no fuzzy.
      fuzzyMatches: [{ id: 'c2', name: 'Nubank Ultravioleta' }],
    });

    const consumed = await callResolvePending(service, cardPending, '2');

    expect(consumed).toBe(true);
    expect(cardsRepository.findByNameFuzzy).toHaveBeenCalledWith(
      'Nubank Ultravioleta',
      ['u1'],
    );
    expect(transactionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50, cardId: 'c2' }),
    );
  });

  it('resposta com o NOME (parcial, sem acento) também resolve', async () => {
    const { service, transactionsRepository } = buildService({
      fuzzyMatches: [{ id: 'c2', name: 'Nubank Ultravioleta' }],
    });

    const consumed = await callResolvePending(
      service,
      cardPending,
      'ultravioleta',
    );

    expect(consumed).toBe(true);
    expect(transactionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ cardId: 'c2' }),
    );
  });

  it('"sem cartão" registra sem vínculo de cartão', async () => {
    const { service, transactionsRepository } = buildService({});

    const consumed = await callResolvePending(
      service,
      cardPending,
      'sem cartão',
    );

    expect(consumed).toBe(true);
    expect(transactionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50, cardId: undefined }),
    );
  });

  it('"cancela" descarta a pendência sem registrar', async () => {
    const { service, conversation, transactionsRepository, sent } =
      buildService({});

    const consumed = await callResolvePending(service, cardPending, 'cancela');

    expect(consumed).toBe(true);
    expect(conversation.clearPending).toHaveBeenCalled();
    expect(transactionsRepository.create).not.toHaveBeenCalled();
    expect(sent[0]).toContain('Nada foi registrado');
  });

  it('resposta não relacionada NÃO é consumida (segue pro fluxo normal)', async () => {
    const { service, transactionsRepository } = buildService({});

    const consumed = await callResolvePending(
      service,
      cardPending,
      'quanto gastei hoje?',
    );

    expect(consumed).toBe(false);
    expect(transactionsRepository.create).not.toHaveBeenCalled();
  });

  it('usuário SEM cartões: "sim" registra sem cartão', async () => {
    const { service, transactionsRepository } = buildService({});

    const consumed = await callResolvePending(
      service,
      { ...cardPending, options: [] },
      'sim',
    );

    expect(consumed).toBe(true);
    expect(transactionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ cardId: undefined }),
    );
  });
});
