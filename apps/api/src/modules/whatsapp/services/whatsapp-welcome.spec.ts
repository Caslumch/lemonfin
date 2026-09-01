import { WhatsappService } from './whatsapp.service';

// Boas-vindas de PRIMEIRO CONTATO em handleIncomingMessage: usuário registrado
// sem whatsappWelcomedAt deve ser recebido — saudação seca ganha a apresentação
// completa (sem passar pelo parser); pedido de verdade ganha uma linha de
// boas-vindas e segue o fluxo normal. Usuário já recebido não ganha nada.
function buildService(overrides: {
  user: { id: string; name: string; whatsappWelcomedAt: Date | null };
  parseResult?: unknown;
}) {
  const sent: { to: string; content: string }[] = [];

  const usersRepository = {
    findByPhoneCandidates: jest.fn().mockResolvedValue(overrides.user),
    setWhatsappWelcomed: jest.fn().mockResolvedValue({}),
  };
  const wmodeClient = {
    sendMessage: jest.fn().mockImplementation((msg: (typeof sent)[number]) => {
      sent.push(msg);
      return Promise.resolve({ id: 'msg-1' });
    }),
  };
  const conversation = {
    getPending: jest.fn().mockResolvedValue(null),
    clearPending: jest.fn(),
    getHistory: jest.fn().mockResolvedValue([]),
    appendHistory: jest.fn().mockResolvedValue(undefined),
  };
  const categoriesRepository = {
    findForUser: jest.fn().mockResolvedValue([]),
  };
  const familyContext = {
    resolveUserIds: jest.fn().mockResolvedValue(['user-1']),
    listMembers: jest.fn().mockResolvedValue([]),
  };
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
    {} as never, // advisorMemories
    {} as never, // memoryExtraction
  );

  return {
    service,
    usersRepository,
    wmodeClient,
    conversation,
    messageParser,
    sent,
  };
}

const neverWelcomed = {
  id: 'user-1',
  name: 'Maria Clara Souza',
  whatsappWelcomedAt: null,
};

describe('WhatsappService.handleIncomingMessage — boas-vindas de primeiro contato', () => {
  it('saudação seca → apresentação completa, sem chamar o parser', async () => {
    const { service, usersRepository, messageParser, sent } = buildService({
      user: neverWelcomed,
    });

    await service.handleIncomingMessage({
      from: '5511999999999@c.us',
      content: 'oi',
      sessionId: 'sess-1',
    });

    expect(usersRepository.setWhatsappWelcomed).toHaveBeenCalledWith(
      'user-1',
      expect.any(Date),
    );
    expect(messageParser.parse).not.toHaveBeenCalled();
    expect(sent).toHaveLength(1);
    expect(sent[0].content).toContain('Oi, Maria! 👋');
    expect(sent[0].content).toContain('*ajuda*');
  });

  it('"ajuda" no primeiro contato → apresentação completa (não a lista crua)', async () => {
    const { service, messageParser, sent } = buildService({
      user: neverWelcomed,
    });

    await service.handleIncomingMessage({
      from: '5511999999999@c.us',
      content: 'ajuda',
      sessionId: 'sess-1',
    });

    expect(messageParser.parse).not.toHaveBeenCalled();
    expect(sent).toHaveLength(1);
    expect(sent[0].content).toContain('Que bom te ver por aqui');
  });

  it('pedido de verdade → linha de boas-vindas + fluxo normal', async () => {
    const { service, usersRepository, messageParser, sent } = buildService({
      user: neverWelcomed,
    });

    await service.handleIncomingMessage({
      from: '5511999999999@c.us',
      content: 'gastei 50 no mercado',
      sessionId: 'sess-1',
    });

    expect(usersRepository.setWhatsappWelcomed).toHaveBeenCalledTimes(1);
    expect(messageParser.parse).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(2);
    expect(sent[0].content).toContain('Oi, Maria! 👋');
    expect(sent[0].content).toContain('pode deixar comigo');
    // A segunda mensagem é a resposta normal do fluxo (aqui, o fallback do
    // parser mockado).
    expect(sent[1].content).toBe('Não entendi 😅');
  });

  it('usuário já recebido → nenhuma boas-vindas, fluxo direto', async () => {
    const { service, usersRepository, sent } = buildService({
      user: { ...neverWelcomed, whatsappWelcomedAt: new Date('2026-07-01') },
    });

    await service.handleIncomingMessage({
      from: '5511999999999@c.us',
      content: 'oi',
      sessionId: 'sess-1',
    });

    expect(usersRepository.setWhatsappWelcomed).not.toHaveBeenCalled();
    expect(sent).toHaveLength(1);
    expect(sent[0].content).toBe('Não entendi 😅');
  });
});
