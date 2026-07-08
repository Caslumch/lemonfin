import {
  ConversationRepository,
  LastAction,
  PendingConfirmation,
} from './conversation.repository';

// Testa o TTL de pending/lastAction: um estado velho não pode mais valer — um
// "cancela" dias depois apagava uma ação que o usuário nem lembrava. O
// repositório carimba savedAt ao salvar e trata vencido (ou sem carimbo, de
// registros antigos) como inexistente.
function buildRepo(state: { pending?: unknown; lastAction?: unknown }) {
  const upserts: unknown[] = [];
  const prisma = {
    conversationState: {
      findUnique: jest.fn().mockResolvedValue({
        phone: '5511999',
        pending: state.pending ?? null,
        lastAction: state.lastAction ?? null,
        history: [],
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
