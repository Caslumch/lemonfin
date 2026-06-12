import { Injectable } from '@nestjs/common';
import type { VerificationCode, VerificationCodeType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class VerificationCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    type: VerificationCodeType;
    email: string;
    codeHash: string;
    expiresAt: Date;
    userId?: string | null;
  }): Promise<VerificationCode> {
    return this.prisma.verificationCode.create({ data });
  }

  /**
   * Código ATIVO mais recente para (email, type): não consumido e não expirado.
   * Só um código vale por vez — emitir um novo invalida os anteriores
   * (ver invalidatePrevious).
   */
  async findActive(
    email: string,
    type: VerificationCodeType,
  ): Promise<VerificationCode | null> {
    return this.prisma.verificationCode.findFirst({
      where: {
        email,
        type,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Marca como consumidos todos os códigos ativos daquele (email, type). Chamado
   * antes de emitir um novo OTP, para que apenas o último valha.
   */
  async invalidatePrevious(
    email: string,
    type: VerificationCodeType,
  ): Promise<void> {
    await this.prisma.verificationCode.updateMany({
      where: { email, type, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }

  async incrementAttempts(id: string): Promise<number> {
    const updated = await this.prisma.verificationCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    return updated.attempts;
  }

  async consume(id: string): Promise<void> {
    await this.prisma.verificationCode.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }
}
