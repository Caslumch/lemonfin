import { SubscriptionStatus } from '@prisma/client';
import { PremiumAccessService } from './premium-access.service';

const future = new Date('2026-07-01T00:00:00Z');
const past = new Date('2026-06-01T00:00:00Z');
const now = new Date('2026-06-16T00:00:00Z');

// User mínimo com o que hasPremiumAccess/resolve leem.
const mkUser = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  subscriptionStatus: SubscriptionStatus.CANCELED,
  trialEndsAt: null,
  currentPeriodEnd: null,
  stripeCustomerId: null,
  ...over,
});

describe('PremiumAccessService', () => {
  let billing: { findById: jest.Mock };
  let families: { findByUserId: jest.Mock };
  let svc: PremiumAccessService;

  beforeEach(() => {
    billing = { findById: jest.fn() };
    families = { findByUserId: jest.fn().mockResolvedValue(null) };
    svc = new PremiumAccessService(billing as never, families as never);
  });

  it('source=self quando a própria assinatura está ACTIVE', async () => {
    billing.findById.mockResolvedValue(
      mkUser({ subscriptionStatus: SubscriptionStatus.ACTIVE }),
    );
    const a = await svc.resolve('u1', now);
    expect(a).toMatchObject({ hasPremium: true, source: 'self' });
    expect(families.findByUserId).not.toHaveBeenCalled();
  });

  it('source=self durante o trial vigente', async () => {
    billing.findById.mockResolvedValue(
      mkUser({
        subscriptionStatus: SubscriptionStatus.TRIALING,
        trialEndsAt: future,
      }),
    );
    const a = await svc.resolve('u1', now);
    expect(a).toMatchObject({ hasPremium: true, source: 'self' });
  });

  it('source=family quando o DONO da família é ACTIVE', async () => {
    const member = mkUser({ id: 'u1' }); // sem acesso próprio
    const owner = mkUser({
      id: 'owner',
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    });
    billing.findById.mockImplementation((id: string) =>
      Promise.resolve(id === 'owner' ? owner : member),
    );
    families.findByUserId.mockResolvedValue({
      ownerId: 'owner',
      members: [{ user: { id: 'u1' } }, { user: { id: 'owner' } }],
    });

    const a = await svc.resolve('u1', now);
    expect(a).toMatchObject({ hasPremium: true, source: 'family' });
    // O status retornado é o do PRÓPRIO membro, não o do dono.
    expect(a.subscriptionStatus).toBe(SubscriptionStatus.CANCELED);
  });

  it('source=none quando nem o usuário nem o dono têm acesso', async () => {
    const member = mkUser({ id: 'u1' });
    const owner = mkUser({
      id: 'owner',
      subscriptionStatus: SubscriptionStatus.TRIALING,
      trialEndsAt: past, // trial do dono expirado
    });
    billing.findById.mockImplementation((id: string) =>
      Promise.resolve(id === 'owner' ? owner : member),
    );
    families.findByUserId.mockResolvedValue({
      ownerId: 'owner',
      members: [{ user: { id: 'u1' } }],
    });

    const a = await svc.resolve('u1', now);
    expect(a).toMatchObject({ hasPremium: false, source: 'none' });
  });

  it('o próprio DONO não se cobre via família (evita auto-loop)', async () => {
    // dono sem acesso próprio; findByUserId devolve a família dele, mas
    // ownerId === userId, então não tenta cobrir.
    billing.findById.mockResolvedValue(mkUser({ id: 'owner' }));
    families.findByUserId.mockResolvedValue({
      ownerId: 'owner',
      members: [{ user: { id: 'owner' } }],
    });
    const a = await svc.resolve('owner', now);
    expect(a).toMatchObject({ hasPremium: false, source: 'none' });
    // só buscou o próprio user (não buscou um "dono" separado)
    expect(billing.findById).toHaveBeenCalledTimes(1);
  });

  it('canManage reflete ter stripeCustomerId', async () => {
    billing.findById.mockResolvedValue(mkUser({ stripeCustomerId: 'cus_1' }));
    const a = await svc.resolve('u1', now);
    expect(a.canManage).toBe(true);
  });
});
