import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// Mesma chave do UsersRepository (findById tem cache 5min) — invalidar após
// mexer no acesso, senão o paywall vê status velho.
const userByIdKey = (id: string) => `user:id:${id}`;

@Injectable()
export class AdminUserActionsUseCase {
  private readonly logger = new Logger(AdminUserActionsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /** Estende o trial em N dias a partir do maior entre (agora, trial atual). */
  async extendTrial(userId: string, days: number): Promise<void> {
    const user = await this.requireUser(userId);
    const base =
      user.trialEndsAt && user.trialEndsAt > new Date()
        ? user.trialEndsAt
        : new Date();
    const trialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: userId },
      data: { trialEndsAt, subscriptionStatus: SubscriptionStatus.TRIALING },
    });
    await this.invalidate(userId);
    this.logger.log(`Admin: trial de ${userId} estendido +${days}d`);
  }

  /**
   * Concede premium manual (cortesia). Seta ACTIVE + currentPeriodEnd futuro.
   * ATENÇÃO: se o usuário tiver assinatura Stripe real, um webhook futuro pode
   * sobrescrever este status — cortesia é melhor para quem NÃO tem Stripe.
   */
  async grantPremium(userId: string, days: number): Promise<void> {
    await this.requireUser(userId);
    const currentPeriodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        currentPeriodEnd,
      },
    });
    await this.invalidate(userId);
    this.logger.log(`Admin: premium concedido a ${userId} por ${days}d`);
  }

  /** Revoga o acesso premium (volta a CANCELED). */
  async revokePremium(userId: string): Promise<void> {
    await this.requireUser(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: SubscriptionStatus.CANCELED },
    });
    await this.invalidate(userId);
    this.logger.log(`Admin: premium revogado de ${userId}`);
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  private async invalidate(userId: string) {
    await this.cache.del(userByIdKey(userId));
  }
}
