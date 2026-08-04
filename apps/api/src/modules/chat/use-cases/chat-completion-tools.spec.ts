import { ChatCompletionUseCase } from './chat-completion.use-case';

// Testa as TOOLS do assessor (executeFunctionCall): metas, reservas, contas
// fixas, cartões/fatura, previsão e insights — o que tirou o advisor da
// cegueira de "só transações". Valida o mapeamento/serialização de cada uma
// (o modelo só vê o JSON retornado aqui).
const decimal = (v: number) => ({ toNumber: () => v });

function buildUseCase(overrides: {
  goals?: unknown[];
  reserves?: unknown[];
  recurrings?: unknown[];
  cards?: unknown[];
  cardSummary?: { total: number; count: number };
  forecast?: unknown;
  insights?: unknown;
  rememberDeduped?: boolean;
  forgetResult?: boolean;
}) {
  const config = { getOrThrow: jest.fn().mockReturnValue('test-key') };
  const transactionsRepository = {
    getCardSummary: jest
      .fn()
      .mockResolvedValue(overrides.cardSummary ?? { total: 0, count: 0 }),
  };
  const familyContext = { resolveUserIds: jest.fn().mockResolvedValue(['u1']) };
  const listGoals = {
    execute: jest.fn().mockResolvedValue(overrides.goals ?? []),
  };
  const reservesRepository = {
    findMany: jest.fn().mockResolvedValue(overrides.reserves ?? []),
  };
  const recurringRepository = {
    findMany: jest.fn().mockResolvedValue(overrides.recurrings ?? []),
  };
  const cardsRepository = {
    findMany: jest.fn().mockResolvedValue(overrides.cards ?? []),
  };
  const getForecast = {
    execute: jest.fn().mockResolvedValue(overrides.forecast),
  };
  const getInsights = {
    execute: jest.fn().mockResolvedValue(overrides.insights),
  };
  const advisorMemories = {
    list: jest.fn().mockResolvedValue([]),
    remember: jest.fn().mockImplementation((userId: string, content: string) =>
      Promise.resolve({
        id: 'mem1',
        content,
        deduped: overrides.rememberDeduped ?? false,
      }),
    ),
    forget: jest.fn().mockResolvedValue(overrides.forgetResult ?? true),
  };

  const useCase = new ChatCompletionUseCase(
    config as never,
    transactionsRepository as never,
    familyContext as never,
    {} as never, // aiUsage
    listGoals as never,
    reservesRepository as never,
    recurringRepository as never,
    cardsRepository as never,
    getForecast as never,
    getInsights as never,
    advisorMemories as never,
    {} as never, // cache
  );

  return {
    useCase,
    listGoals,
    reservesRepository,
    recurringRepository,
    cardsRepository,
    transactionsRepository,
    advisorMemories,
  };
}

const callTool = (
  useCase: ChatCompletionUseCase,
  name: string,
  args = '{}',
): Promise<Record<string, unknown>> =>
  (
    useCase as unknown as {
      executeFunctionCall: (
        n: string,
        args: string,
        userId: string,
        userIds: string[],
      ) => Promise<Record<string, unknown>>;
    }
  ).executeFunctionCall(name, args, 'u1', ['u1']);

describe('ChatCompletionUseCase — tools do assessor', () => {
  it('getSpendingGoals expõe limite/gasto/percentual/estouro por meta', async () => {
    const { useCase, listGoals } = buildUseCase({
      goals: [
        {
          category: { name: 'Alimentação' },
          period: 'MONTHLY',
          progress: {
            limit: 800,
            spent: 650,
            percentage: 81,
            remaining: 150,
            exceeded: false,
          },
        },
      ],
    });

    const out = await callTool(useCase, 'getSpendingGoals');

    expect(listGoals.execute).toHaveBeenCalledWith('u1');
    expect(out.goals).toEqual([
      {
        category: 'Alimentação',
        period: 'MONTHLY',
        limit: '800.00',
        spent: '650.00',
        percentage: 81,
        remaining: '150.00',
        exceeded: false,
      },
    ]);
  });

  it('getSpendingGoals sem metas devolve nota explícita (o modelo não inventa)', async () => {
    const { useCase } = buildUseCase({ goals: [] });
    const out = await callTool(useCase, 'getSpendingGoals');
    expect(out.goals).toEqual([]);
    expect(out.note).toContain('nao tem metas');
  });

  it('getReserves calcula progresso/aporte sugerido a partir do alvo e prazo', async () => {
    // Datas FIXAS (não relativas a hoje): monthsRemaining conta só a diferença
    // de mês do calendário, então `hoje + 2 meses` via setMonth estourava no dia
    // 31 (31/07 → 01/10 = 3 meses) e o teste ficava flaky por dia/fuso no CI.
    // Ancorar "agora" no dia 15 e o prazo 2 meses adiante mantém 2 meses cravado.
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T12:00:00Z').getTime());
    const deadline = new Date('2026-03-15T12:00:00Z'); // 2 meses depois
    const { useCase } = buildUseCase({
      reserves: [
        {
          name: 'viagem',
          targetAmount: decimal(5000),
          savedAmount: decimal(2000),
          deadline,
          active: true,
        },
      ],
    });

    try {
      const out = await callTool(useCase, 'getReserves');
      const [reserve] = out.reserves as Array<Record<string, unknown>>;

      expect(reserve.name).toBe('viagem');
      expect(reserve.target).toBe('5000.00');
      expect(reserve.saved).toBe('2000.00');
      expect(reserve.percentage).toBe(40);
      expect(reserve.remaining).toBe('3000.00');
      expect(reserve.completed).toBe(false);
      // 3000 restantes em 2 meses → 1500/mês.
      expect(reserve.suggestedMonthly).toBe('1500.00');
    } finally {
      jest.useRealTimers();
    }
  });

  it('getRecurringTransactions soma totais fixos de despesa e receita', async () => {
    const { useCase, recurringRepository } = buildUseCase({
      recurrings: [
        {
          description: 'Aluguel',
          amount: decimal(1500),
          type: 'EXPENSE',
          dayOfMonth: 5,
          category: { name: 'Moradia' },
        },
        {
          description: 'Netflix',
          amount: decimal(55.9),
          type: 'EXPENSE',
          dayOfMonth: 10,
          category: { name: 'Lazer' },
        },
        {
          description: 'Salário',
          amount: decimal(6000),
          type: 'INCOME',
          dayOfMonth: 1,
          category: { name: 'Salário' },
        },
      ],
    });

    const out = await callTool(useCase, 'getRecurringTransactions');

    // Só as ativas interessam ao assessor.
    expect(recurringRepository.findMany).toHaveBeenCalledWith(['u1'], true);
    expect((out.recurring as unknown[]).length).toBe(3);
    expect(out.monthlyExpenseTotal).toBe('1555.90');
    expect(out.monthlyIncomeTotal).toBe('6000.00');
  });

  it('getCardsAndInvoices traz fatura aberta + fechamento + vencimento por cartão', async () => {
    const { useCase, transactionsRepository } = buildUseCase({
      cards: [{ id: 'c1', name: 'Nubank', closingDay: 28, dueDay: 5 }],
      cardSummary: { total: 1234.5, count: 7 },
    });

    const out = await callTool(useCase, 'getCardsAndInvoices');
    const [card] = out.cards as Array<Record<string, unknown>>;

    // Consulta o total do ciclo via a régua única (cardCycleRange).
    expect(transactionsRepository.getCardSummary).toHaveBeenCalledWith(
      ['u1'],
      'c1',
      expect.any(String),
      expect.any(String),
    );
    expect(card.name).toBe('Nubank');
    expect(card.openInvoiceTotal).toBe('1234.50');
    expect(card.purchases).toBe(7);
    expect(typeof card.closesAt).toBe('string');
    expect(typeof card.dueDate).toBe('string'); // dueDay cadastrado → tem vencimento
  });

  it('getCardsAndInvoices sem dueDay devolve dueDate null', async () => {
    const { useCase } = buildUseCase({
      cards: [{ id: 'c1', name: 'Visa', closingDay: 10, dueDay: null }],
    });

    const out = await callTool(useCase, 'getCardsAndInvoices');
    const [card] = out.cards as Array<Record<string, unknown>>;
    expect(card.dueDate).toBeNull();
  });

  it('getMonthEndForecast serializa a previsão com as recorrências pendentes', async () => {
    const { useCase } = buildUseCase({
      forecast: {
        currentBalance: 1200.5,
        projectedBalance: -300.25,
        pendingIncome: 0,
        pendingExpense: 1500,
        estimatedVariableExpense: 800.75,
        avgDailyVariableExpense: 40,
        daysRemaining: 10,
        pending: [
          {
            id: 'r1',
            description: 'Aluguel',
            amount: 1500,
            type: 'EXPENSE',
            dayOfMonth: 28,
            category: null,
          },
        ],
      },
    });

    const out = await callTool(useCase, 'getMonthEndForecast');

    expect(out.projectedBalance).toBe('-300.25');
    expect(out.daysRemaining).toBe(10);
    expect(out.pendingRecurrences).toEqual([
      {
        description: 'Aluguel',
        amount: '1500.00',
        type: 'EXPENSE',
        dayOfMonth: 28,
      },
    ]);
  });

  it('getSpendingInsights serializa comparações e alertas sem campos de UI', async () => {
    const { useCase } = buildUseCase({
      insights: {
        currentMonth: { income: 6000, expense: 4200, balance: 1800 },
        previousMonth: { income: 6000, expense: 3500, balance: 2500 },
        overallVariation: 20,
        alerts: [
          {
            categoryId: 'cat1',
            category: {
              id: 'cat1',
              name: 'Lazer',
              slug: 'lazer',
              icon: '🎮',
              colorBg: '#fff',
              colorText: '#000',
            },
            currentTotal: 480,
            previousTotal: 500,
            percentOfPrevious: 96,
            daysRemaining: 12,
          },
        ],
        categoryComparisons: [],
        topGrowing: [
          {
            category: { name: 'Alimentação' },
            currentTotal: 900,
            previousTotal: 600,
            variation: 50,
          },
        ],
        topShrinking: [],
      },
    });

    const out = await callTool(useCase, 'getSpendingInsights');

    expect(out.overallVariationPercent).toBe(20);
    expect(out.topGrowing).toEqual([
      {
        category: 'Alimentação',
        current: '900.00',
        previous: '600.00',
        variationPercent: 50,
      },
    ]);
    const [alert] = out.alerts as Array<Record<string, unknown>>;
    expect(alert.category).toBe('Lazer');
    expect(alert.percentOfPrevious).toBe(96);
    // Campos de UI (cores/ids) não vão pro modelo.
    expect(alert.colorBg).toBeUndefined();
  });

  it('rememberFact salva o fato escopado ao usuário e devolve o id', async () => {
    const { useCase, advisorMemories } = buildUseCase({});

    const out = await callTool(
      useCase,
      'rememberFact',
      JSON.stringify({ fact: 'Quer quitar o cartao ate dezembro' }),
    );

    expect(advisorMemories.remember).toHaveBeenCalledWith(
      'u1',
      'Quer quitar o cartao ate dezembro',
    );
    expect(out.saved).toBe(true);
    expect(out.memoryId).toBe('mem1');
  });

  it('rememberFact duplicado devolve saved=false com nota (modelo não re-salva)', async () => {
    const { useCase } = buildUseCase({ rememberDeduped: true });

    const out = await callTool(
      useCase,
      'rememberFact',
      JSON.stringify({ fact: 'Quer quitar o cartao ate dezembro' }),
    );

    expect(out.saved).toBe(false);
    expect(out.note).toContain('ja estava');
  });

  it('rememberFact sem fato devolve erro (não cria memória vazia)', async () => {
    const { useCase, advisorMemories } = buildUseCase({});

    const out = await callTool(
      useCase,
      'rememberFact',
      JSON.stringify({ fact: '   ' }),
    );

    expect(advisorMemories.remember).not.toHaveBeenCalled();
    expect(out.error).toBeDefined();
  });

  it('forgetFact apaga pelo id escopado ao usuário', async () => {
    const { useCase, advisorMemories } = buildUseCase({});

    const out = await callTool(
      useCase,
      'forgetFact',
      JSON.stringify({ memoryId: 'mem1' }),
    );

    expect(advisorMemories.forget).toHaveBeenCalledWith('u1', 'mem1');
    expect(out.forgotten).toBe(true);
  });

  it('forgetFact com id inexistente devolve forgotten=false com nota', async () => {
    const { useCase } = buildUseCase({ forgetResult: false });

    const out = await callTool(
      useCase,
      'forgetFact',
      JSON.stringify({ memoryId: 'nao-existe' }),
    );

    expect(out.forgotten).toBe(false);
    expect(out.note).toContain('nao encontrado');
  });

  it('função desconhecida devolve erro amigável', async () => {
    const { useCase } = buildUseCase({});
    const out = await callTool(useCase, 'algoQueNaoExiste');
    expect(out.error).toBeDefined();
  });
});
