import { Injectable } from '@nestjs/common';
import type { SubscriptionStatus } from '@prisma/client';
import { BillingRepository } from '../repositories/billing.repository';
import { FamiliesRepository } from '../../families/repositories/families.repository';
import { hasPremiumAccess } from '../../../common/billing/premium-access';

export interface EffectiveAccess {
  hasPremium: boolean;
  // De onde veio o acesso: a própria assinatura ('self'), a do dono da família
  // ('family'), ou ninguém ('none'). Útil para a UI (membro não vê botão de
  // compra) e para mensagens.
  source: 'self' | 'family' | 'none';
  // Status/período da assinatura do PRÓPRIO usuário (não do dono).
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  // Tem customer no Stripe → pode abrir o portal.
  canManage: boolean;
  // Nome do dono da família, presente só quando source === 'family' — para a UI
  // dizer "Premium herdado de <nome>".
  familyOwnerName: string | null;
}

/**
 * Resolve o acesso premium EFETIVO de um usuário, considerando a cobertura por
 * família: a assinatura do OWNER cobre todos os membros.
 *
 * O acesso é SEMPRE derivado em request-time (nunca copiado entre usuários) —
 * se o dono cancela, os membros perdem acesso na próxima checagem.
 *
 * Fonte única usada pelo GET /billing/status e, no PR de enforcement, pelo
 * PremiumGuard e pelo fluxo do WhatsApp.
 */
@Injectable()
export class PremiumAccessService {
  constructor(
    private readonly billing: BillingRepository,
    private readonly families: FamiliesRepository,
  ) {}

  /** Booleano simples de acesso efetivo (self OU dono da família). */
  async hasAccess(userId: string, now: Date = new Date()): Promise<boolean> {
    return (await this.resolve(userId, now)).hasPremium;
  }

  async resolve(
    userId: string,
    now: Date = new Date(),
  ): Promise<EffectiveAccess> {
    const user = await this.billing.findById(userId);
    if (!user) {
      return {
        hasPremium: false,
        source: 'none',
        subscriptionStatus: 'CANCELED' as SubscriptionStatus,
        currentPeriodEnd: null,
        trialEndsAt: null,
        canManage: false,
        familyOwnerName: null,
      };
    }

    const base = {
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
      trialEndsAt: user.trialEndsAt,
      canManage: Boolean(user.stripeCustomerId),
      familyOwnerName: null,
    };

    // Assinatura PRÓPRIA paga (ACTIVE) tem prioridade — quem paga sozinho é
    // sempre 'self', nunca aparece como coberto pela família.
    if (user.subscriptionStatus === 'ACTIVE') {
      return { ...base, hasPremium: true, source: 'self' };
    }

    // Cobertura pela família vem ANTES do trial próprio: se o dono tem acesso,
    // o membro herda (source 'family') mesmo estando no próprio trial — assim a
    // UI mostra "Premium herdado de X" em vez de oferecer planos a quem já está
    // coberto. Decisão: dono pagante cobre toda a família, qualquer que seja o
    // estado individual do membro.
    const family = await this.families.findByUserId(userId);
    if (family && family.ownerId !== userId) {
      const owner = await this.billing.findById(family.ownerId);
      if (owner && hasPremiumAccess(owner, now)) {
        // Nome do dono vem da própria família (members já inclui user.name).
        const ownerName =
          family.members.find((m) => m.user.id === family.ownerId)?.user.name ??
          null;
        return {
          ...base,
          hasPremium: true,
          source: 'family',
          familyOwnerName: ownerName,
        };
      }
    }

    // Sem assinatura paga própria e sem cobertura da família: o trial próprio
    // (se válido) ainda dá acesso 'self'.
    if (hasPremiumAccess(user, now)) {
      return { ...base, hasPremium: true, source: 'self' };
    }

    return { ...base, hasPremium: false, source: 'none' };
  }
}
