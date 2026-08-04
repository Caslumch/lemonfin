import * as Sentry from '@sentry/nestjs';
import { WebhookController } from './webhook.controller';

// Mock do Sentry: sem DSN o captureException é no-op, mas queremos verificar que
// uma falha PÓS-CLAIM vira dead-letter (capturada com messageId/from), para não
// perder a mensagem em silêncio quando o retry do WMode for rejeitado.
jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
}));

function buildController(overrides: {
  processResult?: Promise<unknown>;
  claim?: boolean;
}) {
  const whatsappService = {
    handleIncomingMessage: jest
      .fn()
      .mockReturnValue(overrides.processResult ?? Promise.resolve(undefined)),
  };
  const processedMessages = {
    claim: jest.fn().mockResolvedValue(overrides.claim ?? true),
  };

  const controller = new WebhookController(
    whatsappService as never,
    processedMessages as never,
  );
  return { controller, whatsappService, processedMessages };
}

const payload = (over: Partial<Record<string, unknown>> = {}) => ({
  event: 'message.received',
  payload: {
    sessionId: 'sess-1',
    messageId: 'msg-1',
    from: '5511999@c.us',
    content: 'gastei 50 no mercado',
    type: 'TEXT' as const,
    timestamp: 0,
    ...over,
  },
  timestamp: '',
});

// Deixa as promessas pendentes (o .catch detached) resolverem.
const flush = () => new Promise((r) => setImmediate(r));

describe('WebhookController.handleWebhook', () => {
  beforeEach(() => jest.clearAllMocks());

  it('captura no Sentry (dead-letter) quando o processamento falha PÓS-claim', async () => {
    const boom = new Error('kaboom');
    const { controller, processedMessages } = buildController({
      processResult: Promise.reject(boom),
    });

    const res = await controller.handleWebhook(payload() as never);
    await flush();

    // Respondeu rápido (fire-and-forget) e consumiu o claim.
    expect(res).toEqual({ received: true, processed: true });
    expect(processedMessages.claim).toHaveBeenCalledWith('msg-1');

    // A falha pós-claim virou dead-letter com contexto para reprocessar.
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [err, ctx] = (Sentry.captureException as jest.Mock).mock.calls[0];
    expect(err).toBe(boom);
    expect(ctx.tags).toMatchObject({
      area: 'whatsapp-webhook',
      kind: 'post_claim_failure',
    });
    expect(ctx.extra).toMatchObject({
      messageId: 'msg-1',
      from: '5511999@c.us',
      claimConsumed: true,
    });
  });

  it('NÃO captura no Sentry no caminho feliz', async () => {
    const { controller } = buildController({
      processResult: Promise.resolve(undefined),
    });

    await controller.handleWebhook(payload() as never);
    await flush();

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('ignora mensagem duplicada (claim já consumido) sem processar', async () => {
    const { controller, whatsappService } = buildController({ claim: false });

    const res = await controller.handleWebhook(payload() as never);
    await flush();

    expect(res).toEqual({ received: true, processed: false });
    expect(whatsappService.handleIncomingMessage).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('ignora eventos que não são message.received', async () => {
    const { controller, whatsappService, processedMessages } = buildController(
      {},
    );

    const res = await controller.handleWebhook({
      event: 'message.ack',
      payload: {},
      timestamp: '',
    } as never);

    expect(res).toEqual({ received: true, processed: false });
    expect(processedMessages.claim).not.toHaveBeenCalled();
    expect(whatsappService.handleIncomingMessage).not.toHaveBeenCalled();
  });
});
