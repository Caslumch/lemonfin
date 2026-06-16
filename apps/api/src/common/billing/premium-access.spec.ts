import { SubscriptionStatus } from '@prisma/client';
import { hasPremiumAccess } from './premium-access';

describe('hasPremiumAccess', () => {
  const now = new Date('2026-06-16T12:00:00Z');
  const future = new Date('2026-06-20T12:00:00Z');
  const past = new Date('2026-06-10T12:00:00Z');

  it('libera quando assinatura ACTIVE (mesmo sem trial)', () => {
    expect(
      hasPremiumAccess(
        { subscriptionStatus: SubscriptionStatus.ACTIVE, trialEndsAt: null },
        now,
      ),
    ).toBe(true);
  });

  it('libera durante o trial (TRIALING e trialEndsAt no futuro)', () => {
    expect(
      hasPremiumAccess(
        { subscriptionStatus: SubscriptionStatus.TRIALING, trialEndsAt: future },
        now,
      ),
    ).toBe(true);
  });

  it('bloqueia trial expirado (TRIALING e trialEndsAt no passado)', () => {
    expect(
      hasPremiumAccess(
        { subscriptionStatus: SubscriptionStatus.TRIALING, trialEndsAt: past },
        now,
      ),
    ).toBe(false);
  });

  it('bloqueia TRIALING sem trialEndsAt', () => {
    expect(
      hasPremiumAccess(
        { subscriptionStatus: SubscriptionStatus.TRIALING, trialEndsAt: null },
        now,
      ),
    ).toBe(false);
  });

  it('bloqueia PAST_DUE e CANCELED', () => {
    expect(
      hasPremiumAccess(
        { subscriptionStatus: SubscriptionStatus.PAST_DUE, trialEndsAt: future },
        now,
      ),
    ).toBe(false);
    expect(
      hasPremiumAccess(
        { subscriptionStatus: SubscriptionStatus.CANCELED, trialEndsAt: future },
        now,
      ),
    ).toBe(false);
  });
});
