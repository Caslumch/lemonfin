import { SubscriptionStatus } from '@prisma/client';
import { AdminUserActionsUseCase } from './admin-user-actions.use-case';

describe('AdminUserActionsUseCase', () => {
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let cache: { del: jest.Mock };
  let uc: AdminUserActionsUseCase;

  const now = new Date();

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'u1', trialEndsAt: null }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    cache = { del: jest.fn().mockResolvedValue(undefined) };
    uc = new AdminUserActionsUseCase(prisma as never, cache as never);
  });

  it('extendTrial: seta TRIALING e invalida o cache', async () => {
    await uc.extendTrial('u1', 7);
    const arg = prisma.user.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'u1' });
    expect(arg.data.subscriptionStatus).toBe(SubscriptionStatus.TRIALING);
    expect(arg.data.trialEndsAt.getTime()).toBeGreaterThan(now.getTime());
    expect(cache.del).toHaveBeenCalledWith('user:id:u1');
  });

  it('extendTrial: parte do trial futuro se houver', async () => {
    const future = new Date(now.getTime() + 5 * 86400_000);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', trialEndsAt: future });
    await uc.extendTrial('u1', 7);
    const arg = prisma.user.update.mock.calls[0][0];
    // 5 dias futuros + 7 = ~12 dias à frente
    expect(arg.data.trialEndsAt.getTime()).toBeGreaterThan(
      future.getTime() + 6 * 86400_000,
    );
  });

  it('grantPremium: seta ACTIVE + currentPeriodEnd futuro', async () => {
    await uc.grantPremium('u1', 30);
    const arg = prisma.user.update.mock.calls[0][0];
    expect(arg.data.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
    expect(arg.data.currentPeriodEnd.getTime()).toBeGreaterThan(now.getTime());
    expect(cache.del).toHaveBeenCalledWith('user:id:u1');
  });

  it('revokePremium: seta CANCELED', async () => {
    await uc.revokePremium('u1');
    const arg = prisma.user.update.mock.calls[0][0];
    expect(arg.data.subscriptionStatus).toBe(SubscriptionStatus.CANCELED);
    expect(cache.del).toHaveBeenCalledWith('user:id:u1');
  });

  it('lança NotFound se o usuário não existe', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(uc.revokePremium('x')).rejects.toThrow(
      'Usuário não encontrado',
    );
  });
});
