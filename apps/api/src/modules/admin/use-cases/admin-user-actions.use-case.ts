import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { SetTtsSettingsInput } from '../dtos/admin.dto';

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

  /**
   * Configura a voz (TTS) da conta: habilitar + voz + rate/pitch/volume. Só
   * grava os campos enviados (patch parcial). Invalida o cache do usuário.
   */
  async setTtsSettings(
    userId: string,
    input: SetTtsSettingsInput,
  ): Promise<void> {
    await this.requireUser(userId);
    const data: Record<string, unknown> = {};
    if (input.enabled !== undefined) data.ttsEnabled = input.enabled;
    if (input.voice !== undefined) data.ttsVoice = input.voice;
    if (input.rate !== undefined) data.ttsRate = input.rate;
    if (input.pitch !== undefined) data.ttsPitch = input.pitch;
    if (input.volume !== undefined) data.ttsVolume = input.volume;
    if (Object.keys(data).length === 0) return;
    await this.prisma.user.update({ where: { id: userId }, data });
    await this.invalidate(userId);
    this.logger.log(`Admin: TTS de ${userId} atualizado (${Object.keys(data).join(', ')})`);
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
