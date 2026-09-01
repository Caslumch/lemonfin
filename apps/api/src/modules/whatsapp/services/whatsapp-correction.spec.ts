import { WhatsappService } from './whatsapp.service';

// Testa handleCorrection ("o total era X"): corrige a ÚLTIMA AÇÃO da conversa
// pelo tipo dela — grupo inteiro para parcelamento (redividindo o novo total,
// resíduo na última parcela), a transação da ação para avulsa, e despesa +
// savedAmount para aporte de reserva. Sem lastAction, só corrige a última
// transação global se ela for RECENTE. Mocka só as dependências desse caminho.
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
  const reservesRepository = {
    addContribution: jest.fn().mockResolvedValue(undefined),
    removeContribution: jest.fn().mockResolvedValue(undefined),
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
    reservesRepository as never,
    {} as never, // goals
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
    reservesRepository,
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

  it('corrige a transação da ÚLTIMA AÇÃO (não a última global)', async () => {
    const { service, transactionsRepository, conversation, updates, sent } =
      buildService({
        lastAction: {
          kind: 'transaction',
          transactionIds: ['tx-acao'],
          label: 'R$ 50,00 em Alimentação',
          description: 'mercado',
        },
        groupRows: [
          {
            id: 'tx-acao',
            amount: 50,
            description: 'mercado',
            category: { name: 'Alimentação', icon: '🍽️' },
          },
        ],
        // Última global é OUTRA transação — não pode ser tocada.
        lastTx: {
          id: 'tx-web',
          amount: 999,
          description: 'compra no painel',
          category: { name: 'Outros', icon: '📦' },
          createdAt: new Date(),
        },
      });

    await callCorrection(service, 45);

    expect(updates).toEqual([{ id: 'tx-acao', amount: 45 }]);
    expect(transactionsRepository.findLastByUser).not.toHaveBeenCalled();
    // Rótulo da ação atualizado (segue cancelável com o valor novo).
    expect(conversation.setLastAction).toHaveBeenCalledWith(
      '5511999',
      expect.objectContaining({ label: expect.stringContaining('45') }),
    );
    expect(sent[0]).toContain('Alimentação');
  });

  it('corrige um APORTE de reserva ajustando a despesa E o savedAmount (delta)', async () => {
    const { service, reservesRepository, updates, sent } = buildService({
      lastAction: {
        kind: 'reserve-contribution',
        transactionIds: ['tx-aporte'],
        reserveId: 'r1',
        amount: 200,
        label: 'Guardado em Viagem',
      },
      groupRows: [
        {
          id: 'tx-aporte',
          amount: 200,
          description: 'Guardado: Viagem',
          category: { name: 'Reservas', icon: '🏦' },
        },
      ],
    });

    // 200 → 300: reserva recebe +100.
    await callCorrection(service, 300);

    expect(updates).toEqual([{ id: 'tx-aporte', amount: 300 }]);
    expect(reservesRepository.addContribution).toHaveBeenCalledWith('r1', 100);
    expect(reservesRepository.removeContribution).not.toHaveBeenCalled();
    expect(sent[0]).toContain('aporte');
  });

  it('corrige um APORTE pra baixo revertendo a diferença na reserva', async () => {
    const { service, reservesRepository } = buildService({
      lastAction: {
        kind: 'reserve-contribution',
        transactionIds: ['tx-aporte'],
        reserveId: 'r1',
        amount: 200,
        label: 'Guardado em Viagem',
      },
      groupRows: [
        {
          id: 'tx-aporte',
          amount: 200,
          description: 'Guardado: Viagem',
          category: { name: 'Reservas', icon: '🏦' },
        },
      ],
    });

    // 200 → 150: reserva devolve 50.
    await callCorrection(service, 150);

    expect(reservesRepository.removeContribution).toHaveBeenCalledWith(
      'r1',
      50,
    );
    expect(reservesRepository.addContribution).not.toHaveBeenCalled();
  });

  it('corrige a última transação global quando não há lastAction E ela é recente', async () => {
    const { service, transactionsRepository, updates, sent } = buildService({
      lastAction: null,
      lastTx: {
        id: 'tx9',
        amount: 50,
        description: 'mercado',
        category: { name: 'Alimentacao', icon: '🍽️' },
        createdAt: new Date(),
      },
    });

    await callCorrection(service, 45);

    // Só a transação avulsa foi atualizada.
    expect(transactionsRepository.update).toHaveBeenCalledTimes(1);
    expect(updates[0]).toEqual({ id: 'tx9', amount: 45 });
    expect(sent[0]).toContain('Alimentacao');
  });

  it('NÃO corrige a última transação global se ela for antiga', async () => {
    const { service, transactionsRepository, sent } = buildService({
      lastAction: null,
      lastTx: {
        id: 'tx-old',
        amount: 50,
        description: 'mercado',
        category: { name: 'Alimentacao', icon: '🍽️' },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 dias
      },
    });

    await callCorrection(service, 45);

    // Corrigir um lançamento de dias atrás por engano é pior que orientar.
    expect(transactionsRepository.update).not.toHaveBeenCalled();
    expect(sent[0]).toContain('Não achei um registro recente');
  });

  it('avisa (sem corrigir outra transação) se o grupo referenciado já não existe', async () => {
    const { service, transactionsRepository, sent } = buildService({
      lastAction: {
        kind: 'installment',
        transactionIds: ['gone1', 'gone2'],
        installmentGroupId: 'g-old',
        installments: 2,
        label: 'tênis (2x de R$ 50,00)',
      },
      groupRows: [], // grupo apagado
      lastTx: {
        id: 'tx-fallback',
        amount: 10,
        description: null,
        category: { name: 'Outros', icon: '📦' },
        createdAt: new Date(),
      },
    });

    await callCorrection(service, 15);

    // Grupo vazio NÃO pode redirecionar a correção pra outra transação.
    expect(transactionsRepository.update).not.toHaveBeenCalled();
    expect(transactionsRepository.findLastByUser).not.toHaveBeenCalled();
    expect(sent[0]).toContain('já não existe');
  });

  it('lote: orienta em vez de chutar qual item corrigir', async () => {
    const { service, transactionsRepository, sent } = buildService({
      lastAction: {
        kind: 'batch',
        transactionIds: ['b1', 'b2', 'b3'],
        installmentGroupIds: [],
        count: 3,
        label: '3 lançamentos',
      },
    });

    await callCorrection(service, 60);

    expect(transactionsRepository.update).not.toHaveBeenCalled();
    expect(sent[0]).toContain('lote');
  });

  it('avisa quando não há nada para corrigir', async () => {
    const { service, transactionsRepository, sent } = buildService({
      lastAction: null,
      lastTx: null,
    });

    await callCorrection(service, 99);

    expect(transactionsRepository.update).not.toHaveBeenCalled();
    expect(sent[0]).toContain('Não achei um registro recente');
  });
});
