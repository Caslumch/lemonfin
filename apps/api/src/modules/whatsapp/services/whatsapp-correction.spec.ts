import { WhatsappService } from './whatsapp.service';

// Testa handleCorrection ("o total era X"): corrige o GRUPO INTEIRO quando a
// última ação foi um parcelamento (redividindo o novo total, resíduo na última
// parcela), com fallback para a transação avulsa quando não há lastAction.
// Mocka só as dependências desse caminho.
function buildService(overrides: {
  lastAction?: unknown;
  lastTx?: unknown;
  groupRows?: unknown[];
}) {
  const sent: string[] = [];
  const updates: Array<{ id: string; amount?: number }> = [];

  const conversation = {
    getLastAction: jest.fn().mockResolvedValue(overrides.lastAction ?? null),
    setLastAction: jest.fn().mockResolvedValue(undefined),
  };
  const transactionsRepository = {
    findLastByUser: jest.fn().mockResolvedValue(overrides.lastTx ?? null),
    findManyByIds: jest.fn().mockResolvedValue(overrides.groupRows ?? []),
    update: jest
      .fn()
      .mockImplementation((id: string, data: { amount?: number }) => {
        updates.push({ id, amount: data.amount });
        return Promise.resolve(undefined);
      }),
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

  return {
    service,
    conversation,
    transactionsRepository,
    wmodeClient,
    sent,
    updates,
  };
}

const callCorrection = (
  service: WhatsappService,
  newAmount: number,
  phoneKey = '5511999',
): Promise<void> =>
  (
    service as unknown as {
      handleCorrection: (
        f: string,
        u: string,
        r: { intent: 'correction'; newAmount: number },
        p?: string,
      ) => Promise<void>;
    }
  ).handleCorrection(
    '5511999@c.us',
    'u1',
    { intent: 'correction', newAmount },
    phoneKey,
  );

// Parcelas fictícias de um grupo (3x de R$ 33,33/33,34 → total 100).
const group3x = (amounts: number[]) =>
  amounts.map((amount, i) => ({
    id: `p${i + 1}`,
    amount,
    installmentNumber: i + 1,
    installmentTotal: amounts.length,
    description: `tênis (${i + 1}/${amounts.length})`,
    category: { name: 'Compras', icon: '🛍️' },
  }));

describe('WhatsappService.handleCorrection', () => {
  it('corrige o GRUPO inteiro de um parcelamento e preserva soma == total', async () => {
    const { service, transactionsRepository, updates, sent } = buildService({
      lastAction: {
        kind: 'installment',
        transactionIds: ['p1', 'p2', 'p3'],
        installmentGroupId: 'g1',
        installments: 3,
        label: 'tênis (3x de R$ 33,33)',
      },
      groupRows: group3x([33.33, 33.33, 33.34]),
    });

    // Novo total: R$ 120 em 3x → 40 + 40 + 40.
    await callCorrection(service, 120);

    // Atualizou TODAS as 3 parcelas (não só a última).
    expect(transactionsRepository.update).toHaveBeenCalledTimes(3);
    const sum = updates.reduce((s, u) => s + (u.amount ?? 0), 0);
    expect(Math.round(sum * 100) / 100).toBe(120);
    // Fallback de transação avulsa NÃO foi acionado.
    expect(transactionsRepository.findLastByUser).not.toHaveBeenCalled();
    expect(sent[0]).toContain('parcelamento');
  });

  it('mantém o resíduo de arredondamento na última parcela', async () => {
    const { service, updates } = buildService({
      lastAction: {
        kind: 'installment',
        transactionIds: ['p1', 'p2', 'p3'],
        installmentGroupId: 'g1',
        installments: 3,
        label: 'x',
      },
      groupRows: group3x([10, 10, 10]),
    });

    // R$ 100 em 3x → 33,33 + 33,33 + 33,34.
    await callCorrection(service, 100);

    const amounts = updates.map((u) => u.amount);
    expect(amounts).toEqual([33.33, 33.33, 33.34]);
    expect(amounts.reduce((s: number, a) => s + (a ?? 0), 0)).toBeCloseTo(
      100,
      2,
    );
  });

  it('faz fallback para a transação avulsa quando não há lastAction', async () => {
    const { service, transactionsRepository, updates, sent } = buildService({
      lastAction: null,
      lastTx: {
        id: 'tx9',
        amount: 50,
        description: 'mercado',
        category: { name: 'Alimentacao', icon: '🍽️' },
      },
    });

    await callCorrection(service, 45);

    // Só a transação avulsa foi atualizada.
    expect(transactionsRepository.update).toHaveBeenCalledTimes(1);
    expect(updates[0]).toEqual({ id: 'tx9', amount: 45 });
    expect(sent[0]).toContain('Alimentacao');
  });

  it('cai no fallback se o grupo referenciado já não existe', async () => {
    const { service, transactionsRepository } = buildService({
      lastAction: {
        kind: 'installment',
        transactionIds: ['gone1', 'gone2'],
        installmentGroupId: 'g-old',
        installments: 2,
        label: 'x',
      },
      groupRows: [], // grupo apagado
      lastTx: {
        id: 'tx-fallback',
        amount: 10,
        description: null,
        category: { name: 'Outros', icon: '📦' },
      },
    });

    await callCorrection(service, 15);

    // Grupo vazio → fallback de transação avulsa.
    expect(transactionsRepository.findLastByUser).toHaveBeenCalled();
    expect(transactionsRepository.update).toHaveBeenCalledWith('tx-fallback', {
      amount: 15,
    });
  });

  it('avisa quando não há nada para corrigir', async () => {
    const { service, transactionsRepository, sent } = buildService({
      lastAction: null,
      lastTx: null,
    });

    await callCorrection(service, 99);

    expect(transactionsRepository.update).not.toHaveBeenCalled();
    expect(sent[0]).toContain('Nenhuma transação');
  });
});
