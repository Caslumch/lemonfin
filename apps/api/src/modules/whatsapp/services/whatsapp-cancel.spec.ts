import { WhatsappService } from './whatsapp.service';

// Testa só o handleCancel: cancela a ÚLTIMA AÇÃO inteira (parcelamento/lote)
// via lastAction, com fallback para a última transação. Mocka apenas as 4
// dependências que esse caminho usa; as demais ficam como stubs vazios.
function buildService(overrides: {
  lastAction?: unknown;
  lastTx?: unknown;
  deleteManyCount?: number;
}) {
  const sent: string[] = [];

  const conversation = {
    getLastAction: jest.fn().mockResolvedValue(overrides.lastAction ?? null),
    clearLastAction: jest.fn().mockResolvedValue(undefined),
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
  );

  return {
    service,
    conversation,
    transactionsRepository,
    reservesRepository,
    wmodeClient,
    sent,
  };
}

// Acesso ao método privado.
const callCancel = (
  service: WhatsappService,
  phoneKey = '5511999',
): Promise<void> =>
  (
    service as unknown as {
      handleCancel: (f: string, u: string, p?: string) => Promise<void>;
    }
  ).handleCancel('5511999@c.us', 'u1', phoneKey);

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
    // Não cai no fallback de transação única.
    expect(transactionsRepository.findLastByUser).not.toHaveBeenCalled();
    expect(transactionsRepository.delete).not.toHaveBeenCalled();
    expect(conversation.clearLastAction).toHaveBeenCalled();
    expect(sent[0]).toContain('4');
  });

  it('faz fallback para a última transação quando não há lastAction', async () => {
    const { service, transactionsRepository, sent } = buildService({
      lastAction: null,
      lastTx: {
        id: 'tx9',
        amount: 50,
        category: { name: 'Alimentacao' },
        description: 'mercado',
      },
    });

    await callCancel(service);

    expect(transactionsRepository.deleteManyByIds).not.toHaveBeenCalled();
    expect(transactionsRepository.delete).toHaveBeenCalledWith('tx9');
    expect(sent[0]).toContain('Alimentacao');
  });

  it('avisa quando não há nada para cancelar', async () => {
    const { service, transactionsRepository, sent } = buildService({
      lastAction: null,
      lastTx: null,
    });

    await callCancel(service);

    expect(transactionsRepository.delete).not.toHaveBeenCalled();
    expect(sent[0]).toContain('Nenhuma transação');
  });

  it('cai no fallback se o lastAction já não removeu nada (ids inexistentes)', async () => {
    const { service, transactionsRepository } = buildService({
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
      },
    });

    await callCancel(service);

    expect(transactionsRepository.deleteManyByIds).toHaveBeenCalled();
    // Como deleteMany não removeu nada, cai no fallback de transação única.
    expect(transactionsRepository.delete).toHaveBeenCalledWith('tx-fallback');
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
});
