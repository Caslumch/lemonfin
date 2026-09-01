import {
  ConversationRepository,
  LastAction,
  PendingConfirmation,
} from './conversation.repository';

// Testa o TTL de pending/lastAction: um estado velho não pode mais valer — um
// "cancela" dias depois apagava uma ação que o usuário nem lembrava. O
// repositório carimba savedAt ao salvar e trata vencido (ou sem carimbo, de
// registros antigos) como inexistente.
function buildRepo(state: {
  pending?: unknown;
  lastAction?: unknown;
  history?: unknown;
}) {
  const upserts: unknown[] = [];
  const prisma = {
    conversationState: {
      findUnique: jest.fn().mockResolvedValue({
        phone: '5511999',
        pending: state.pending ?? null,
        lastAction: state.lastAction ?? null,
        history: state.history ?? [],
      }),
      upsert: jest.fn().mockImplementation((args: unknown) => {
        upserts.push(args);
        return Promise.resolve(undefined);
      }),
    },
  };
  return { repo: new ConversationRepository(prisma as never), prisma, upserts };
}

const minutesAgo = (min: number) =>
  new Date(Date.now() - min * 60 * 1000).toISOString();

const pending: PendingConfirmation = {
  type: 'reserve-contribution',
  amount: 200,
  options: [{ id: 'r1', name: 'Viagem' }],
};

const lastAction: LastAction = {
  kind: 'transaction',
  transactionIds: ['t1'],
  label: 'R$ 50,00 em Alimentação',
};

describe('ConversationRepository TTL', () => {
  it('setPending/setLastAction carimbam savedAt', async () => {
    const { repo, upserts } = buildRepo({});

    await repo.setPending('5511999', pending);
    await repo.setLastAction('5511999', lastAction);

    for (const call of upserts as Array<{
      update: Record<string, { savedAt?: string }>;
    }>) {
      const value = call.update.pending ?? call.update.lastAction;
      expect(typeof value.savedAt).toBe('string');
      expect(Number.isNaN(Date.parse(value.savedAt as string))).toBe(false);
    }
  });

  it('pending fresco é retornado; vencido (>15min) vira null', async () => {
    const fresh = buildRepo({
      pending: { ...pending, savedAt: minutesAgo(5) },
    });
    expect(await fresh.repo.getPending('5511999')).not.toBeNull();

    const stale = buildRepo({
      pending: { ...pending, savedAt: minutesAgo(30) },
    });
    expect(await stale.repo.getPending('5511999')).toBeNull();
  });

  it('lastAction fresco é retornado; vencido (>60min) vira null', async () => {
    const fresh = buildRepo({
      lastAction: { ...lastAction, savedAt: minutesAgo(30) },
    });
    expect(await fresh.repo.getLastAction('5511999')).not.toBeNull();

    const stale = buildRepo({
      lastAction: { ...lastAction, savedAt: minutesAgo(120) },
    });
    expect(await stale.repo.getLastAction('5511999')).toBeNull();
  });

  it('registros SEM savedAt (anteriores ao carimbo) são tratados como vencidos', async () => {
    const { repo } = buildRepo({ pending, lastAction });
    expect(await repo.getPending('5511999')).toBeNull();
    expect(await repo.getLastAction('5511999')).toBeNull();
  });

  it('savedAt inválido é tratado como vencido', async () => {
    const { repo } = buildRepo({
      lastAction: { ...lastAction, savedAt: 'not-a-date' },
    });
    expect(await repo.getLastAction('5511999')).toBeNull();
  });
});

// Janela de contexto da conversa: a queixa original era o bot "não saber o que
// já foi falado" — com 4 trocas de 160 chars o contexto sumia na 3ª mensagem.
describe('ConversationRepository histórico', () => {
  const entry = (text: string, at: string) => ({ role: 'user', text, at });

  it('guarda até 20 trocas (as mais recentes)', async () => {
    const { repo, upserts } = buildRepo({});

    await repo.appendHistory(
      '5511999',
      Array.from({ length: 25 }, (_, i) => ({
        role: 'user' as const,
        text: `msg ${i}`,
      })),
    );

    const [call] = upserts as Array<{
      update: { history: { text: string }[] };
    }>;
    expect(call.update.history).toHaveLength(20);
    expect(call.update.history[0].text).toBe('msg 5');
    expect(call.update.history[19].text).toBe('msg 24');
  });

  it('trunca cada texto em 600 chars (não 160)', async () => {
    const { repo, upserts } = buildRepo({});

    await repo.appendHistory('5511999', [
      { role: 'bot', text: 'x'.repeat(900) },
    ]);

    const [call] = upserts as Array<{
      update: { history: { text: string }[] };
    }>;
    expect(call.update.history[0].text).toHaveLength(600);
  });

  it('carimba `at` em cada entrada gravada', async () => {
    const { repo, upserts } = buildRepo({});

    await repo.appendHistory('5511999', [{ role: 'user', text: 'oi' }]);

    const [call] = upserts as Array<{
      update: { history: { at?: string }[] };
    }>;
    const at = call.update.history[0].at;
    expect(typeof at).toBe('string');
    expect(Number.isNaN(Date.parse(at as string))).toBe(false);
  });

  it('descarta trocas de sessão vencida (>6h) e mantém as da sessão atual', async () => {
    const { repo } = buildRepo({
      history: [
        entry('conversa de ontem', minutesAgo(60 * 8)),
        entry('conversa de agora', minutesAgo(30)),
      ],
    });

    const history = await repo.getHistory('5511999');
    expect(history).toHaveLength(1);
    expect(history[0].text).toBe('conversa de agora');
  });

  it('entradas SEM `at` (anteriores ao carimbo) são tratadas como vencidas', async () => {
    const { repo } = buildRepo({
      history: [{ role: 'user', text: 'legado sem carimbo' }],
    });

    expect(await repo.getHistory('5511999')).toEqual([]);
  });

  it('a sessão vencida não é regravada ao anexar uma troca nova', async () => {
    const { repo, upserts } = buildRepo({
      history: [entry('conversa de ontem', minutesAgo(60 * 8))],
    });

    await repo.appendHistory('5511999', [{ role: 'user', text: 'oi de novo' }]);

    const [call] = upserts as Array<{
      update: { history: { text: string }[] };
    }>;
    expect(call.update.history).toHaveLength(1);
    expect(call.update.history[0].text).toBe('oi de novo');
  });
});
