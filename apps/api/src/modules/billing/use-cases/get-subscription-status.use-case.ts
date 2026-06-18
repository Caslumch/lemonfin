import { Injectable } from '@nestjs/common';
import type { SubscriptionStatus } from '@prisma/client';
import { PremiumAccessService } from '../services/premium-access.service';

export interface SubscriptionStatusView {
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  hasPremium: boolean;
  // 'self' | 'family' | 'none' — o front usa 'family' para não mostrar botão de
  // compra a um membro coberto pela assinatura do dono.
  accessSource: 'self' | 'family' | 'none';
  // Tem customer no Stripe → pode abrir o portal.
  canManage: boolean;
  // Nome do dono quando o acesso vem da família (accessSource === 'family').
  familyOwnerName: string | null;
}

@Injectable()
export class GetSubscriptionStatusUseCase {
  constructor(private readonly access: PremiumAccessService) {}

  async execute(userId: string): Promise<SubscriptionStatusView> {
    const a = await this.access.resolve(userId);
    return {
      subscriptionStatus: a.subscriptionStatus,
      currentPeriodEnd: a.currentPeriodEnd,
      trialEndsAt: a.trialEndsAt,
      hasPremium: a.hasPremium,
      accessSource: a.source,
      canManage: a.canManage,
      familyOwnerName: a.familyOwnerName,
    };
  }
}
