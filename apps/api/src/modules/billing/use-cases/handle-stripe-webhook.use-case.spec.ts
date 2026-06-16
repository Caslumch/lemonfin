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
  let cache: { get: jest.Mock; set: jest.Mock };
  let useCase: HandleStripeWebhookUseCase;

  const user = { id: 'u1', stripeCustomerId: 'cus_1' };

  beforeEach(() => {
    billing = {
      findById: jest.fn().mockResolvedValue(user),
      findByStripeCustomerId: jest.fn().mockResolvedValue(user),
      updateSubscription: jest.fn().mockResolvedValue(undefined),
      setStripeCustomerId: jest.fn().mockResolvedValue(undefined),
    };
    stripe = { getSubscription: jest.fn().mockResolvedValue(sub()) };
    cache = { get: jest.fn().mockResolvedValue(undefined), set: jest.fn() };
    useCase = new HandleStripeWebhookUseCase(
      billing as never,
      stripe as never,
      cache as never,
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
  });

  it('busca a subscription em checkout.session.completed', async () => {
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
  });

  it('invoice.payment_failed → PAST_DUE', async () => {
    await useCase.execute(
      event('invoice.payment_failed', { customer: 'cus_1' }),
    );
    expect(billing.updateSubscription).toHaveBeenCalledWith('u1', {
      subscriptionStatus: SubscriptionStatus.PAST_DUE,
    });
  });

  it('é idempotente: ignora evento já processado', async () => {
    cache.get.mockResolvedValueOnce(true); // já visto
    await useCase.execute(event('customer.subscription.updated', sub()));
    expect(billing.updateSubscription).not.toHaveBeenCalled();
  });

  it('marca o evento como processado ao final', async () => {
    await useCase.execute(event('customer.subscription.updated', sub()));
    expect(cache.set).toHaveBeenCalledWith(
      'stripe:evt:evt_1',
      true,
      expect.any(Number),
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
