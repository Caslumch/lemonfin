import { Injectable, NotFoundException } from '@nestjs/common';
import type { SubscriptionStatus } from '@prisma/client';
import { BillingRepository } from '../repositories/billing.repository';
import { hasPremiumAccess } from '../../../common/billing/premium-access';

export interface SubscriptionStatusView {
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  hasPremium: boolean;
  // Indica se o usuário tem um customer no Stripe (→ pode abrir o portal).
  canManage: boolean;
}

@Injectable()
export class GetSubscriptionStatusUseCase {
  constructor(private readonly billing: BillingRepository) {}

  async execute(userId: string): Promise<SubscriptionStatusView> {
    const user = await this.billing.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    // Self-only por enquanto; a cobertura por família entra no PR 4.
    return {
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
      trialEndsAt: user.trialEndsAt,
      hasPremium: hasPremiumAccess(user),
      canManage: Boolean(user.stripeCustomerId),
    };
  }
}
