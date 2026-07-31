import { WhatsappService } from './whatsapp.service';

// Testa só o handleCancel: cancela a ÚLTIMA AÇÃO inteira (parcelamento/lote)
// via lastAction. Sem lastAction válido, NUNCA apaga direto — oferece a última
// transação recente com confirmação, ou orienta. "cancela <alvo>" só apaga
// direto se o alvo bater com a última ação (senão confirma ou recusa).
// Mocka apenas as dependências que esse caminho usa.
function buildService(overrides: {
  lastAction?: unknown;
  lastTx?: unknown;
  deleteManyCount?: number;
  recurrings?: unknown[];
}) {
  const sent: string[] = [];

  const conversation = {
    getLastAction: jest.fn().mockResolvedValue(overrides.lastAction ?? null),
    clearLastAction: jest.fn().mockResolvedValue(undefined),
    setPending: jest.fn().mockResolvedValue(undefined),
  };
  const transactionsRepository = {
    deleteManyByIds: jest
      .fn()
      .mockResolvedValue(overrides.deleteManyCount ?? 0),
    findLastByUser: jest.fn().mockResolvedValue(overrides.lastTx ?? null),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const reservesRepository = {
    removeContribution: jest.fn().mockResolvedValue(undefined),
  };
  const recurringRepository = {
    findMany: jest.fn().mockResolvedValue(overrides.recurrings ?? []),
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
    recurringRepository as never,
    reservesRepository as never,
    {} as never, // goals
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
    transactionsRepository,
    reservesRepository,
    recurringRepository,
    wmodeClient,
    sent,
  };
}

// Acesso ao método privado.
const callCancel = (
  service: WhatsappService,
  target: string | null = null,
  phoneKey = '5511999',
): Promise<void> =>
  (
    service as unknown as {
      handleCancel: (
        f: string,
        u: string,
        r: { intent: 'cancel'; target: string | null },
        p?: string,
      ) => Promise<void>;
    }
  ).handleCancel('5511999@c.us', 'u1', { intent: 'cancel', target }, phoneKey);

describe('WhatsappService.handleCancel', () => {
  it('cancela a AÇÃO INTEIRA (parcelamento) via lastAction', async () => {
    const { service, transactionsRepository, conversation, sent } =
      buildService({
        lastAction: {
          kind: 'installment',
          transactionIds: ['t1', 't2', 't3', 't4'],
          installmentGroupId: 'g1',
          installments: 4,
          label: 'tênis (4x de R$ 100,00)',
        },
        deleteManyCount: 4,
      });

    await callCancel(service);

    expect(transactionsRepository.deleteManyByIds).toHaveBeenCalledWith(
      ['t1', 't2', 't3', 't4'],
      ['u1'],
    );
    // Não cai em nenhum fallback de transação única.
    expect(transactionsRepository.findLastByUser).not.toHaveBeenCalled();
    expect(transactionsRepository.delete).not.toHaveBeenCalled();
    expect(conversation.clearLastAction).toHaveBeenCalled();
    expect(sent[0]).toContain('4');
  });

  it('sem lastAction, NÃO apaga direto: oferece a última transação recente com confirmação', async () => {
    const { service, transactionsRepository, conversation, sent } =
      buildService({
        lastAction: null,
        lastTx: {
          id: 'tx9',
          amount: 50,
          category: { name: 'Alimentacao' },
          description: 'mercado',
          createdAt: new Date(),
        },
      });

    await callCancel(service);

    // Nada apagado sem confirmação.
    expect(transactionsRepository.delete).not.toHaveBeenCalled();
    expect(transactionsRepository.deleteManyByIds).not.toHaveBeenCalled();
    // Pendência de confirmação apontando pra transação certa.
    expect(conversation.setPending).toHaveBeenCalledWith(
      '5511999',
      expect.objectContaining({
        type: 'cancel-confirm',
        action: expect.objectContaining({ transactionIds: ['tx9'] }),
      }),
    );
    expect(sent[0]).toContain('Alimentacao');
    expect(sent[0]).toContain('sim');
  });

  it('sem lastAction e com última transação ANTIGA, recusa e orienta', async () => {
    const { service, transactionsRepository, conversation, sent } =
      buildService({
        lastAction: null,
        lastTx: {
          id: 'tx-old',
          amount: 50,
          category: { name: 'Alimentacao' },
          description: 'mercado',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 dias
        },
      });

    await callCancel(service);

    expect(transactionsRepository.delete).not.toHaveBeenCalled();
    expect(conversation.setPending).not.toHaveBeenCalled();
    expect(sent[0]).toContain('Não achei um registro recente');
  });

  it('avisa quando não há nada para cancelar', async () => {
    const { service, transactionsRepository, sent } = buildService({
      lastAction: null,
      lastTx: null,
    });

    await callCancel(service);

    expect(transactionsRepository.delete).not.toHaveBeenCalled();
    expect(sent[0]).toContain('Não achei um registro recente');
  });

  it('avisa (sem apagar outra coisa) quando os ids do lastAction já não existem', async () => {
    const { service, transactionsRepository, sent } = buildService({
      lastAction: {
        kind: 'batch',
        transactionIds: ['gone1', 'gone2'],
        installmentGroupIds: [],
        count: 2,
        label: '2 lançamentos',
      },
      deleteManyCount: 0, // nada apagado
      lastTx: {
        id: 'tx-fallback',
        amount: 10,
        category: { name: 'Outros' },
        description: null,
        createdAt: new Date(),
      },
    });

    await callCancel(service);

    expect(transactionsRepository.deleteManyByIds).toHaveBeenCalled();
    // Um "cancela" repetido NÃO pode virar exclusão de outra transação.
    expect(transactionsRepository.delete).not.toHaveBeenCalled();
    expect(sent[0]).toContain('já tinha sido removido');
  });

  it('ao cancelar um APORTE de reserva, também reverte o savedAmount', async () => {
    const {
      service,
      transactionsRepository,
      reservesRepository,
      conversation,
    } = buildService({
      lastAction: {
        kind: 'reserve-contribution',
        transactionIds: ['tx-aporte'],
        reserveId: 'r1',
        amount: 200,
        label: 'Guardado em Viagem',
      },
      deleteManyCount: 1,
    });

    await callCancel(service);

    // Apaga a despesa "Guardado"...
    expect(transactionsRepository.deleteManyByIds).toHaveBeenCalledWith(
      ['tx-aporte'],
      ['u1'],
    );
    // ...E decrementa o acumulado da reserva (sem isso, dinheiro fantasma).
    expect(reservesRepository.removeContribution).toHaveBeenCalledWith(
      'r1',
      200,
    );
    expect(conversation.clearLastAction).toHaveBeenCalled();
  });

  it('NÃO reverte o savedAmount se a despesa do aporte já não existia', async () => {
    const { service, reservesRepository } = buildService({
      lastAction: {
        kind: 'reserve-contribution',
        transactionIds: ['gone'],
        reserveId: 'r1',
        amount: 200,
        label: 'Guardado em Viagem',
      },
      deleteManyCount: 0, // despesa já removida
      lastTx: null,
    });

    await callCancel(service);

    // Sem despesa apagada, não decrementa (evita reverter em dobro).
    expect(reservesRepository.removeContribution).not.toHaveBeenCalled();
  });

  describe('cancela <alvo nomeado>', () => {
    it('apaga direto quando o alvo bate com a descrição da última ação', async () => {
      const { service, transactionsRepository } = buildService({
        lastAction: {
          kind: 'transaction',
          transactionIds: ['tx1'],
          label: 'R$ 25,00 em Transporte',
          description: 'Uber',
        },
        deleteManyCount: 1,
      });

      await callCancel(service, 'uber');

      expect(transactionsRepository.deleteManyByIds).toHaveBeenCalledWith(
        ['tx1'],
        ['u1'],
      );
    });

    it('NÃO apaga quando o alvo é uma conta fixa: recusa e orienta', async () => {
      const { service, transactionsRepository, sent } = buildService({
        lastAction: {
          kind: 'transaction',
          transactionIds: ['tx1'],
          label: 'R$ 50,00 em Alimentação',
          description: 'mercado',
        },
        recurrings: [{ id: 'rec1', description: 'Netflix' }],
      });

      await callCancel(service, 'netflix');

      // O pior bug do fluxo antigo: "cancela a netflix" apagava o mercado.
      expect(transactionsRepository.deleteManyByIds).not.toHaveBeenCalled();
      expect(transactionsRepository.delete).not.toHaveBeenCalled();
      expect(sent[0]).toContain('conta fixa');
      expect(sent[0]).toContain('Netflix');
    });

    it('alvo que não bate com nada pede confirmação em vez de apagar', async () => {
      const { service, transactionsRepository, conversation, sent } =
        buildService({
          lastAction: {
            kind: 'transaction',
            transactionIds: ['tx1'],
            label: 'R$ 50,00 em Alimentação',
            description: 'mercado',
          },
        });

      await callCancel(service, 'academia');

      expect(transactionsRepository.deleteManyByIds).not.toHaveBeenCalled();
      expect(conversation.setPending).toHaveBeenCalledWith(
        '5511999',
        expect.objectContaining({ type: 'cancel-confirm' }),
      );
      expect(sent[0]).toContain('academia');
      expect(sent[0]).toContain('R$ 50,00 em Alimentação');
    });

    it('alvo sem lastAction e sem conta fixa correspondente: recusa sem apagar', async () => {
      const { service, transactionsRepository, sent } = buildService({
        lastAction: null,
        lastTx: {
          id: 'tx9',
          amount: 50,
          category: { name: 'Alimentacao' },
          description: 'mercado',
          createdAt: new Date(),
        },
      });

      await callCancel(service, 'netflix');

      expect(transactionsRepository.delete).not.toHaveBeenCalled();
      expect(sent[0]).toContain('netflix');
      expect(sent[0]).toContain('não apaguei nada');
    });
  });
});
