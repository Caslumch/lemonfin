import { SubscriptionStatus } from '@prisma/client';

/**
 * Regra ÚNICA de acesso premium de UM usuário (sem considerar família).
 *
 * premium = assinatura ACTIVE
 *           OU ainda dentro do trial (TRIALING e trialEndsAt no futuro)
 *
 * A cobertura por família (assinatura do OWNER cobre os membros) é resolvida
 * em request-time pela camada que conhece o FamilyContext — esta função é o
 * bloco base reusado por ela, pelo PremiumGuard e pelo fluxo do WhatsApp.
 *
 * NÃO ler o status cru direto: sempre derivar por aqui, para a regra ficar
 * num só lugar.
 */
export function hasPremiumAccess(
  user: {
    subscriptionStatus: SubscriptionStatus;
    trialEndsAt: Date | null;
  },
  now: Date = new Date(),
): boolean {
  if (user.subscriptionStatus === SubscriptionStatus.ACTIVE) return true;
  if (
    user.subscriptionStatus === SubscriptionStatus.TRIALING &&
    user.trialEndsAt != null &&
    user.trialEndsAt.getTime() > now.getTime()
  ) {
    return true;
  }
  return false;
}
