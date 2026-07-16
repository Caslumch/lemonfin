import { ChatCompletionUseCase } from './chat-completion.use-case';

// Testa o modo finalTurnOnly do executeSync (canal WhatsApp): o preâmbulo que
// o modelo gera ANTES de chamar funções ("vou verificar, um momento...") é
// descartado — só o texto do turno final vira resposta. No streaming (web),
// o comportamento continua o de sempre: todo texto é emitido.
function chunk(delta: Record<string, unknown>) {
  return { choices: [{ delta }] };
}

function streamOf(chunks: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const c of chunks) yield c;
    },
  };
}

// 1º turno: preâmbulo + tool call getSpendingGoals; 2º turno: resposta final.
const PREAMBLE_TURN = streamOf([
  chunk({ content: 'Vou verificar. ' }),
  chunk({ content: 'Um momento, por favor.' }),
  chunk({
    tool_calls: [
      {
        index: 0,
        id: 'call1',
        function: { name: 'getSpendingGoals', arguments: '{}' },
      },
    ],
  }),
  { choices: [], usage: { prompt_tokens: 10, completion_tokens: 5 } },
]);
const FINAL_TURN = streamOf([
  chunk({ content: 'Sua meta está em 90%.' }),
  { choices: [], usage: { prompt_tokens: 12, completion_tokens: 6 } },
]);

function buildUseCase() {
  const config = { getOrThrow: jest.fn().mockReturnValue('test-key') };
  const transactionsRepository = {
    getSummary: jest.fn().mockResolvedValue({
      income: 0,
      expense: 0,
      balance: 0,
      incomeCount: 0,
      expenseCount: 0,
    }),
    getMonthlyBreakdown: jest.fn().mockResolvedValue([]),
    getCategoryBreakdown: jest.fn().mockResolvedValue([]),
    findMany: jest.fn().mockResolvedValue({ data: [], total: 0 }),
  };
  const familyContext = { resolveUserIds: jest.fn().mockResolvedValue(['u1']) };
  const aiUsage = { record: jest.fn().mockResolvedValue(undefined) };
  const listGoals = { execute: jest.fn().mockResolvedValue([]) };
  const advisorMemories = { list: jest.fn().mockResolvedValue([]) };
  const cache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const useCase = new ChatCompletionUseCase(
    config as never,
    transactionsRepository as never,
    familyContext as never,
    aiUsage as never,
    listGoals as never,
    {} as never, // reserves
    {} as never, // recurring
    {} as never, // cards
    {} as never, // forecast
    {} as never, // insights
    advisorMemories as never,
    cache as never,
  );

  const create = jest
    .fn()
    .mockResolvedValueOnce(PREAMBLE_TURN)
    .mockResolvedValueOnce(FINAL_TURN);
  (useCase as unknown as { openai: unknown }).openai = {
    chat: { completions: { create } },
  };

  return { useCase, create };
}

const input = { message: 'como está minha meta?', history: [] };

describe('ChatCompletionUseCase — preâmbulo de tool call', () => {
  it('executeSync (WhatsApp) descarta o preâmbulo e devolve só o turno final', async () => {
    const { useCase, create } = buildUseCase();

    const out = await useCase.executeSync('u1', input, 'Lucas');

    expect(create).toHaveBeenCalledTimes(2);
    expect(out).toBe('Sua meta está em 90%.');
    expect(out).not.toContain('Um momento');
  });

  it('execute (streaming web) continua emitindo o texto de todos os turnos', async () => {
    const { useCase } = buildUseCase();

    let full = '';
    for await (const c of useCase.execute('u1', input, 'Lucas')) {
      full += c;
    }

    expect(full).toContain('Um momento, por favor.');
    expect(full).toContain('Sua meta está em 90%.');
  });
});
