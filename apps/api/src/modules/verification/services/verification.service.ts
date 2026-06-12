import { Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import type { VerificationCodeType } from '@prisma/client';
import { VerificationCodeRepository } from '../repositories/verification-code.repository';

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 5;

export type VerifyResult =
  | { ok: true; userId: string | null }
  | { ok: false; reason: 'NOT_FOUND' | 'EXPIRED' | 'TOO_MANY_ATTEMPTS' | 'INVALID' };

/**
 * Geração e verificação dos OTPs (6 dígitos) usados na confirmação de email e no
 * reset de senha. Regras (ver decisões de produto): 15 min de validade, 5
 * tentativas, uso único. O código é guardado HASHEADO (bcrypt) — nunca em texto.
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(private readonly repo: VerificationCodeRepository) {}

  /**
   * Gera um OTP novo para (email, type), invalida os anteriores e retorna o
   * código EM TEXTO (para o caller mandar por email). O texto não é persistido.
   */
  async issue(
    email: string,
    type: VerificationCodeType,
    userId?: string | null,
  ): Promise<string> {
    // randomInt é CSPRNG; range [0, 1_000_000) com padStart garante 6 dígitos.
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);

    await this.repo.invalidatePrevious(email, type);
    await this.repo.create({
      type,
      email,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      userId: userId ?? null,
    });

    return code;
  }

  /**
   * Verifica o OTP do (email, type). Em sucesso, marca o código como consumido
   * (uso único) e devolve o userId associado. Conta tentativas erradas e bloqueia
   * o código após MAX_ATTEMPTS.
   */
  async verify(
    email: string,
    type: VerificationCodeType,
    code: string,
  ): Promise<VerifyResult> {
    const record = await this.repo.findActive(email, type);
    if (!record) {
      return { ok: false, reason: 'NOT_FOUND' };
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      // Já estourou o limite: invalida de vez para forçar reenvio.
      await this.repo.consume(record.id);
      return { ok: false, reason: 'TOO_MANY_ATTEMPTS' };
    }

    const matches = await bcrypt.compare(code, record.codeHash);
    if (!matches) {
      const attempts = await this.repo.incrementAttempts(record.id);
      if (attempts >= MAX_ATTEMPTS) {
        await this.repo.consume(record.id);
        return { ok: false, reason: 'TOO_MANY_ATTEMPTS' };
      }
      return { ok: false, reason: 'INVALID' };
    }

    await this.repo.consume(record.id);
    return { ok: true, userId: record.userId };
  }
}
