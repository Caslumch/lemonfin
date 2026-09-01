import { WhatsappService } from './whatsapp.service';

// Testa as melhorias de FLUIDEZ: comando "ajuda" determinístico, respostas de
// consulta gravadas no histórico (follow-up "e alimentação?" ganha contexto),
// insight de META em tempo real no registro de gasto e escopo por membro nas
// consultas de categoria.
const decimal = (v: number) => ({ toNumber: () => v });

function buildService(overrides: {
  summary?: Record<string, number>;
  breakdown?: unknown[];
  goal?: unknown;
  member?: { userId: string; name: string };
}) {
  const sent: string[] = [];

  const conversation = {
    appendHistory: jest.fn().mockResolvedValue(undefined),
    setLastAction: jest.fn().mockResolvedValue(undefined),
  };
  const categoriesRepository = {
    findBySlug: jest.fn().mockResolvedValue({
      id: 'cat1',
      slug: 'alimentacao',
      name: 'Alimentação',
      icon: '🍽️',
    }),
  };
  const transactionsRepository = {
    getSummary: jest.fn().mockResolvedValue({
      income: 3000,
      expense: 1200,
      balance: 1800,
      incomeCount: 2,
      expenseCount: 10,
      ...overrides.summary,
    }),
    getCategoryBreakdown: jest
      .fn()
      .mockResolvedValue(overrides.breakdown ?? []),
    findPossibleDuplicate: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'tx-new' }),
  };
  const goalsRepository = {
    findByCategory: jest.fn().mockResolvedValue(overrides.goal ?? null),
  };
  const familyContext = {
    resolveUserIds: jest.fn().mockResolvedValue(['u1']),
    resolveMemberByName: jest.fn().mockResolvedValue(
      overrides.member
        ? {
            status: 'ok',
            userId: overrides.member.userId,
            name: overrides.member.name,
          }
        : { status: 'not_found' },
    ),
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
    goalsRepository as never,
    {} as never, // listGoals
    {} as never, // chat
    conversation as never,
    {} as never, // premiumAccess
    {} as never, // billingConfig
    {} as never, // payInvoice
    {} as never, // tts
    {} as never, // advisorMemories
    {} as never, // memoryExtraction
  );

  return {
    service,
    conversation,
    transactionsRepository,
    familyContext,
    sent,
  };
}

const asAny = (s: WhatsappService) =>
  s as unknown as Record<string, (...args: unknown[]) => Promise<void>> & {
    isHelpCommand: (c: string) => boolean;
    buildHelpMessage: () => string;
  };

describe('comando "ajuda" determinístico', () => {
  it('reconhece variações diretas (com acento e maiúsculas)', () => {
    const { service } = buildService({});
    const s = asAny(service);
    for (const msg of [
      'ajuda',
      'Ajuda',
      'MENU',
      'comandos',
      'o que você faz?',
    ]) {
      expect(s.isHelpCommand(msg)).toBe(true);
    }
  });

  it('NÃO intercepta mensagens normais', () => {
    const { service } = buildService({});
    const s = asAny(service);
    for (const msg of [
      'gastei 50 no mercado',
      'me ajuda a economizar',
      'resumo',
    ]) {
      expect(s.isHelpCommand(msg)).toBe(false);
    }
  });

  it('a mensagem de ajuda enumera as capacidades principais', () => {
    const { service } = buildService({});
    const help = asAny(service).buildHelpMessage();
    for (const term of [
      'Registrar',
      'Consultar',
      'Contas fixas',
      'Metas',
      'Reservas',
      'Cartão',
      'Corrigir',
    ]) {
      expect(help).toContain(term);
    }
  });
});

describe('histórico de consultas (follow-up com contexto)', () => {
  it('resposta de resumo é gravada no histórico como fala do bot', async () => {
    const { service, conversation, sent } = buildService({});

    await asAny(service).handleQuery(
      '5511999@c.us',
      'u1',
      { intent: 'query', queryType: 'summary' },
      '5511999',
    );

    expect(sent).toHaveLength(1);
    expect(conversation.appendHistory).toHaveBeenCalledWith('5511999', [
      expect.objectContaining({ role: 'bot' }),
    ]);
    // Gravado numa linha só (sem quebras), pro bloco de contexto do parser.
    const [, [entry]] = conversation.appendHistory.mock.calls[0] as [
      string,
      Array<{ role: string; text: string }>,
    ];
    expect(entry.text).not.toContain('\n');
  });
});

describe('escopo por membro na consulta de categoria', () => {
  it('"o que a Danielle gastou com alimentação" filtra pelo membro', async () => {
    const { service, transactionsRepository, familyContext, sent } =
      buildService({
        member: { userId: 'u-dani', name: 'Danielle Silva' },
        breakdown: [{ categoryId: 'cat1', total: 320, count: 4 }],
      });

    await asAny(service).handleCategoryQuery(
      '5511999@c.us',
      'u1',
      'alimentacao',
      '5511999',
      'Danielle',
    );

    expect(familyContext.resolveMemberByName).toHaveBeenCalledWith(
      'u1',
      'Danielle',
    );
    // A consulta rodou só com o userId do membro, não a família toda.
    expect(transactionsRepository.getCategoryBreakdown).toHaveBeenCalledWith(
      ['u-dani'],
      expect.any(String),
      expect.any(String),
    );
    expect(sent[0]).toContain('(Danielle)');
  });
});

describe('insight de meta em tempo real no registro', () => {
  const tx = (amount: number) => ({
    intent: 'transaction' as const,
    data: {
      amount,
      type: 'EXPENSE' as const,
      categorySlug: 'alimentacao',
      categoryConfidence: 1,
      description: 'mercado',
    },
  });

  it('meta estourada avisa com 🚨 e o de/para', async () => {
    const { service, sent } = buildService({
      goal: { amount: decimal(800), period: 'MONTHLY' },
      breakdown: [{ categoryId: 'cat1', total: 900, count: 8 }],
    });

    await asAny(service).handleTransaction(
      '5511999@c.us',
      'u1',
      tx(100),
      '5511999',
    );

    expect(sent[0]).toContain('🚨 Estourou a meta');
    expect(sent[0]).toContain('113%');
  });

  it('>=80% da meta avisa com ⚠️', async () => {
    const { service, sent } = buildService({
      goal: { amount: decimal(800), period: 'MONTHLY' },
      breakdown: [{ categoryId: 'cat1', total: 680, count: 6 }],
    });

    await asAny(service).handleTransaction(
      '5511999@c.us',
      'u1',
      tx(50),
      '5511999',
    );

    expect(sent[0]).toContain('⚠️');
    expect(sent[0]).toContain('85%');
  });

  it('dentro da meta mostra o % de forma leve', async () => {
    const { service, sent } = buildService({
      goal: { amount: decimal(800), period: 'MONTHLY' },
      breakdown: [{ categoryId: 'cat1', total: 400, count: 4 }],
    });

    await asAny(service).handleTransaction(
      '5511999@c.us',
      'u1',
      tx(50),
      '5511999',
    );

    expect(sent[0]).toContain('50% da meta');
    expect(sent[0]).not.toContain('⚠️');
  });

  it('sem meta, mantém o insight de total do mês', async () => {
    const { service, sent } = buildService({
      goal: null,
      breakdown: [{ categoryId: 'cat1', total: 400, count: 4 }],
    });

    await asAny(service).handleTransaction(
      '5511999@c.us',
      'u1',
      tx(50),
      '5511999',
    );

    expect(sent[0]).toContain('Você já gastou');
    expect(sent[0]).not.toContain('meta');
  });
});
