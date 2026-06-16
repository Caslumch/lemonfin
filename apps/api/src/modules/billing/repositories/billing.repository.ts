import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { SubscriptionStatus, User } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// Mesma chave usada pelo UsersRepository (findById tem cache de 5min). Toda
// escrita de status de assinatura PRECISA invalidar essa entrada, senão o
// usuário vê status velho por até 5min depois de pagar/cancelar.
const userByIdKey = (id: string) => `user:id:${id}`;

@Injectable()
export class BillingRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByStripeCustomerId(customerId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });
  }

  async setStripeCustomerId(userId: string, customerId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
    await this.cache.del(userByIdKey(userId));
  }

  async updateSubscription(
    userId: string,
    data: {
      subscriptionStatus: SubscriptionStatus;
      stripeSubscriptionId?: string | null;
      currentPeriodEnd?: Date | null;
    },
  ): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data });
    await this.cache.del(userByIdKey(userId));
  }
}
