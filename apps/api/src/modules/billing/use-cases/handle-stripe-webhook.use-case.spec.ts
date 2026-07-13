import { SubscriptionStatus } from '@prisma/client';
import { HandleStripeWebhookUseCase } from './handle-stripe-webhook.use-case';

// Helpers para montar objetos do Stripe com só o que o handler lê.
const sub = (over: Record<string, unknown> = {}) =>
  ({
    id: 'sub_1',
    customer: 'cus_1',
    status: 'active',
    metadata: {},
    items: { data: [{ current_period_end: 1_750_000_000 }] },
    ...over,
  }) as never;

const event = (type: string, object: unknown, id = 'evt_1') =>
  ({ id, type, data: { object } }) as never;

describe('HandleStripeWebhookUseCase', () => {
  let billing: {
    findById: jest.Mock;
    findByStripeCustomerId: jest.Mock;
    updateSubscription: jest.Mock;
    setStripeCustomerId: jest.Mock;
  };
  let stripe: { getSubscription: jest.Mock };
  let processedEvents: { claim: jest.Mock; release: jest.Mock };
  let mail: {
    sendSubscriptionWelcome: jest.Mock;
    sendPaymentFailed: jest.Mock;
    sendSubscriptionCanceled: jest.Mock;
  };
  let useCase: HandleStripeWebhookUseCase;

  const user = {
    id: 'u1',
    stripeCustomerId: 'cus_1',
    email: 'u1@example.com',
    name: 'Fulano de Tal',
  };

  beforeEach(() => {
    billing = {
      findById: jest.fn().mockResolvedValue(user),
      findByStripeCustomerId: jest.fn().mockResolvedValue(user),
      updateSubscription: jest.fn().mockResolvedValue(undefined),
      setStripeCustomerId: jest.fn().mockResolvedValue(undefined),
    };
    stripe = { getSubscription: jest.fn().mockResolvedValue(sub()) };
    processedEvents = {
      claim: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
    };
    mail = {
      sendSubscriptionWelcome: jest.fn().mockResolvedValue(true),
      sendPaymentFailed: jest.fn().mockResolvedValue(true),
      sendSubscriptionCanceled: jest.fn().mockResolvedValue(true),
    };
    useCase = new HandleStripeWebhookUseCase(
      billing as never,
      stripe as never,
      mail as never,
      processedEvents as never,
    );
  });

  it('sincroniza ACTIVE em customer.subscription.updated', async () => {
    await useCase.execute(event('customer.subscription.updated', sub()));
    expect(billing.updateSubscription).toHaveBeenCalledWith('u1', {
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      stripeSubscriptionId: 'sub_1',
      currentPeriodEnd: new Date(1_750_000_000 * 1000),
    });
  });

  it('mapeia past_due → PAST_DUE', async () => {
    await useCase.execute(
      event('customer.subscription.updated', sub({ status: 'past_due' })),
    );
    expect(billing.updateSubscription).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        subscriptionStatus: SubscriptionStatus.PAST_DUE,
      }),
    );
  });

  it('marca CANCELED em customer.subscription.deleted', async () => {
    await useCase.execute(
      event('customer.subscription.deleted', sub({ status: 'canceled' })),
    );
    expect(billing.updateSubscription).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        subscriptionStatus: SubscriptionStatus.CANCELED,
      }),
    );
    expect(mail.sendSubscriptionCanceled).toHaveBeenCalledWith(
      'u1@example.com',
      'Fulano de Tal',
    );
  });

  it('busca a subscription e manda boas-vindas em checkout.session.completed', async () => {
    await useCase.execute(
      event('checkout.session.completed', { subscription: 'sub_1' }),
    );
    expect(stripe.getSubscription).toHaveBeenCalledWith('sub_1');
    expect(billing.updateSubscription).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      }),
    );
    expect(mail.sendSubscriptionWelcome).toHaveBeenCalledWith(
      'u1@example.com',
      'Fulano de Tal',
    );
  });

  it('invoice.payment_failed → PAST_DUE + email de falha', async () => {
    await useCase.execute(
      event('invoice.payment_failed', { customer: 'cus_1' }),
    );
    expect(billing.updateSubscription).toHaveBeenCalledWith('u1', {
      subscriptionStatus: SubscriptionStatus.PAST_DUE,
    });
    expect(mail.sendPaymentFailed).toHaveBeenCalledWith(
      'u1@example.com',
      'Fulano de Tal',
    );
  });

  it('invoice.payment_succeeded NÃO manda email de falha', async () => {
    await useCase.execute(
      event('invoice.payment_succeeded', { customer: 'cus_1' }),
    );
    expect(mail.sendPaymentFailed).not.toHaveBeenCalled();
  });

  it('é idempotente: claim negado (evento já processado) não reprocessa', async () => {
    processedEvents.claim.mockResolvedValueOnce(false); // já visto (durável)
    await useCase.execute(event('customer.subscription.updated', sub()));
    expect(billing.updateSubscription).not.toHaveBeenCalled();
  });

  it('reivindica o evento ANTES de processar (sobrevive a restart)', async () => {
    await useCase.execute(event('customer.subscription.updated', sub()));
    expect(processedEvents.claim).toHaveBeenCalledWith(
      'evt_1',
      'customer.subscription.updated',
    );
  });

  it('falha no processamento LIBERA o claim (permite reenvio manual)', async () => {
    billing.updateSubscription.mockRejectedValueOnce(new Error('db down'));
    await expect(
      useCase.execute(event('customer.subscription.updated', sub())),
    ).rejects.toThrow('db down');
    expect(processedEvents.release).toHaveBeenCalledWith('evt_1');
  });

  it('subscription `incomplete` (3DS em curso) NÃO rebaixa o status', async () => {
    await useCase.execute(
      event('customer.subscription.updated', sub({ status: 'incomplete' })),
    );
    // Antes: incomplete → CANCELED, travando o comprador no meio da
    // autenticação do cartão. Agora: status intocado.
    expect(billing.updateSubscription).not.toHaveBeenCalled();
  });

  it('`incomplete_expired` (pagamento falhou de vez) segue CANCELED', async () => {
    await useCase.execute(
      event(
        'customer.subscription.updated',
        sub({ status: 'incomplete_expired' }),
      ),
    );
    expect(billing.updateSubscription).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        subscriptionStatus: SubscriptionStatus.CANCELED,
      }),
    );
  });

  it('resolve user por metadata.userId quando não acha por customer', async () => {
    billing.findByStripeCustomerId.mockResolvedValue(null);
    await useCase.execute(
      event(
        'customer.subscription.updated',
        sub({ customer: 'cus_x', metadata: { userId: 'u1' } }),
      ),
    );
    expect(billing.findById).toHaveBeenCalledWith('u1');
    expect(billing.updateSubscription).toHaveBeenCalled();
  });
});
