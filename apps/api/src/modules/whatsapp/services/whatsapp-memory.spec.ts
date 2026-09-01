import { WhatsappService } from './whatsapp.service';

// Comandos DIRETOS de memória em handleIncomingMessage: "o que você sabe sobre
// mim" lista os fatos salvos e "esquece tudo" apaga a memória (com confirmação).
// São determinísticos — não passam pelo parser nem pelo assessor —, porque a
// lista precisa ser fiel ao que está salvo e o apagar-tudo é irreversível.
function buildService(overrides: {
  memories?: { id: string; content: string }[];
  pending?: unknown;
  forgetAllCount?: number;
  parseResult?: unknown;
}) {
  const sent: { to: string; content: string }[] = [];

  const usersRepository = {
    findByPhoneCandidates: jest.fn().mockResolvedValue({
      id: 'u1',
      name: 'Lucas',
      whatsappWelcomedAt: new Date('2026-07-01'),
    }),
    setWhatsappWelcomed: jest.fn().mockResolvedValue({}),
  };
  const wmodeClient = {
    sendMessage: jest.fn().mockImplementation((msg: (typeof sent)[number]) => {
      sent.push(msg);
      return Promise.resolve({ id: 'msg-1' });
    }),
  };
  const conversation = {
    getPending: jest.fn().mockResolvedValue(overrides.pending ?? null),
    clearPending: jest.fn().mockResolvedValue(undefined),
    setPending: jest.fn().mockResolvedValue(undefined),
    getHistory: jest.fn().mockResolvedValue([]),
    appendHistory: jest.fn().mockResolvedValue(undefined),
  };
  const advisorMemories = {
    list: jest.fn().mockResolvedValue(overrides.memories ?? []),
    forgetAll: jest.fn().mockResolvedValue(overrides.forgetAllCount ?? 0),
  };
  const categoriesRepository = { findForUser: jest.fn().mockResolvedValue([]) };
  const familyContext = {
    resolveUserIds: jest.fn().mockResolvedValue(['u1']),
    listMembers: jest.fn().mockResolvedValue([]),
  };
  // Se um comando de memória cair aqui, o teste falha: o parser NÃO deve ser
  // chamado por esses comandos (custo de IA + risco de classificação errada).
  const messageParser = {
    parse: jest.fn().mockResolvedValue(
      overrides.parseResult ?? {
        intent: 'unknown',
        message: 'Não entendi 😅',
      },
    ),
  };
  const billingConfig = { enforcementEnabled: false };

  const service = new WhatsappService(
    usersRepository as never,
    categoriesRepository as never,
    {} as never, // transactions
    {} as never, // cards
    familyContext as never,
    {} as never, // createInstallments
    messageParser as never,
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
    billingConfig as never,
    {} as never, // payInvoice
    {} as never, // tts
    advisorMemories as never,
  );

  return {
    service,
    conversation,
    advisorMemories,
    messageParser,
    sent,
  };
}

const send = (service: WhatsappService, content: string) =>
  service.handleIncomingMessage({
    from: '5511999999999@c.us',
    content,
    sessionId: 'sess-1',
  });

describe('WhatsappService — comandos de memória', () => {
  const memories = [
    { id: 'm1', content: 'Quer quitar o cartão até dezembro' },
    { id: 'm2', content: 'Renda variável (freelancer)' },
  ];

  describe('"o que você sabe sobre mim"', () => {
    it('lista os fatos salvos sem passar pelo parser', async () => {
      const { service, messageParser, sent } = buildService({ memories });

      await send(service, 'o que você sabe sobre mim?');

      expect(messageParser.parse).not.toHaveBeenCalled();
      expect(sent).toHaveLength(1);
      expect(sent[0].content).toContain('Quer quitar o cartão até dezembro');
      expect(sent[0].content).toContain('Renda variável (freelancer)');
    });

    it('não vaza os ids internos dos fatos', async () => {
      const { service, sent } = buildService({ memories });

      await send(service, 'o que você sabe sobre mim');

      expect(sent[0].content).not.toContain('m1');
      expect(sent[0].content).not.toContain('m2');
    });

    it('memória vazia → explica que ainda não anotou nada e ensina a salvar', async () => {
      const { service, sent } = buildService({ memories: [] });

      await send(service, 'o que você lembra de mim');

      expect(sent[0].content).toContain('não anotei nada');
      expect(sent[0].content.toLowerCase()).toContain('lembra que');
    });

    it('ensina como apagar (transparência da memória)', async () => {
      const { service, sent } = buildService({ memories });

      await send(service, 'sua memoria');

      expect(sent[0].content).toContain('esquece tudo');
    });
  });

  describe('"esquece tudo"', () => {
    it('NÃO apaga de primeira — pede confirmação com a contagem', async () => {
      const { service, conversation, advisorMemories, sent } = buildService({
        memories,
      });

      await send(service, 'esquece tudo');

      expect(advisorMemories.forgetAll).not.toHaveBeenCalled();
      expect(conversation.setPending).toHaveBeenCalledWith('5511999999999', {
        type: 'forget-all-confirm',
        count: 2,
      });
      expect(sent[0].content).toContain('2 anotações');
    });

    it('tranquiliza que lançamentos/metas/reservas não são apagados', async () => {
      const { service, sent } = buildService({ memories });

      await send(service, 'apaga tudo');

      expect(sent[0].content).toContain('não apaga');
    });

    it('memória vazia → não abre confirmação', async () => {
      const { service, conversation, sent } = buildService({ memories: [] });

      await send(service, 'esquece tudo');

      expect(conversation.setPending).not.toHaveBeenCalled();
      expect(sent[0].content).toContain('Não tem nada pra esquecer');
    });

    it('"sim" na confirmação apaga a memória inteira', async () => {
      const { service, advisorMemories, conversation, sent } = buildService({
        pending: {
          type: 'forget-all-confirm',
          count: 2,
          savedAt: new Date().toISOString(),
        },
        forgetAllCount: 2,
      });

      await send(service, 'sim');

      expect(advisorMemories.forgetAll).toHaveBeenCalledWith('u1');
      expect(conversation.clearPending).toHaveBeenCalled();
      expect(sent[0].content).toContain('2 anotações apagadas');
    });

    it('"não" na confirmação preserva a memória', async () => {
      const { service, advisorMemories, conversation, sent } = buildService({
        pending: {
          type: 'forget-all-confirm',
          count: 2,
          savedAt: new Date().toISOString(),
        },
      });

      await send(service, 'não');

      expect(advisorMemories.forgetAll).not.toHaveBeenCalled();
      expect(conversation.clearPending).toHaveBeenCalled();
      expect(sent[0].content).toContain('não apaguei nada');
    });

    it('resposta fora do vocabulário não apaga — segue o fluxo normal', async () => {
      const { service, advisorMemories, messageParser } = buildService({
        pending: {
          type: 'forget-all-confirm',
          count: 2,
          savedAt: new Date().toISOString(),
        },
      });

      await send(service, 'gastei 50 no mercado');

      expect(advisorMemories.forgetAll).not.toHaveBeenCalled();
      expect(messageParser.parse).toHaveBeenCalled();
    });
  });

  // "esquece" sozinho é o vocabulário de cancelar uma pendência/lançamento — NÃO
  // pode ser confundido com "esquece tudo" (que varre a memória).
  it('"esquece" sozinho NÃO dispara o apagar-tudo', async () => {
    const { service, advisorMemories, messageParser } = buildService({
      memories,
    });

    await send(service, 'esquece');

    expect(advisorMemories.forgetAll).not.toHaveBeenCalled();
    expect(messageParser.parse).toHaveBeenCalled();
  });
});
