import { WhatsappService } from './whatsapp.service';

// Testa o caminho de número não-cadastrado em handleIncomingMessage: deve
// RESPONDER com um convite (link do app), em vez de ignorar silenciosamente.
// Mocka só as 2 dependências usadas nesse caminho (users + wmode); o resto
// fica como stub.
function buildService(overrides: { user?: unknown }) {
  const sent: { to: string; content: string }[] = [];

  const usersRepository = {
    findByPhoneCandidates: jest.fn().mockResolvedValue(overrides.user ?? null),
  };
  const wmodeClient = {
    sendMessage: jest.fn().mockImplementation((msg: (typeof sent)[number]) => {
      sent.push(msg);
      return Promise.resolve();
    }),
  };

  const service = new WhatsappService(
    usersRepository as never,
    {} as never, // categories
    {} as never, // transactions
    {} as never, // cards
    {} as never, // familyContext
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
    {} as never, // conversation
    {} as never, // premiumAccess
    {} as never, // billingConfig
    {} as never, // payInvoice
    {} as never, // tts
    {} as never, // advisorMemories
    {} as never, // memoryExtraction
  );

  return { service, usersRepository, wmodeClient, sent };
}

describe('WhatsappService.handleIncomingMessage — número não-cadastrado', () => {
  it('responde com convite + link quando o telefone não tem conta', async () => {
    const { service, wmodeClient, sent } = buildService({ user: null });

    await service.handleIncomingMessage({
      from: '5511999999999@c.us',
      content: 'gastei 50 no mercado',
      sessionId: 'sess-1',
    });

    expect(wmodeClient.sendMessage).toHaveBeenCalledTimes(1);
    expect(sent[0].to).toBe('5511999999999@c.us');
    expect(sent[0].content).toContain('LemonFin');
    // Inclui um link acionável (app URL).
    expect(sent[0].content).toMatch(/https?:\/\//);
  });
});
